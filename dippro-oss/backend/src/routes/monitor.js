const express = require('express');
const { getAppUrl } = require('../config/appUrl');
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware, requireFranchisor } = require('../middleware/auth');
const { encrypt, decrypt } = require('../config/encryption');
const { analyzeDocumentForDIPImpact } = require('../config/claude');
const { pdfToText } = require('../config/textExtract');
const mammoth = require('mammoth');
const router = express.Router();

// State OAuth signé (HMAC) — transporte uniquement l'id utilisateur, jamais
// son token de session. Le token brut apparaissait auparavant dans l'URL de
// redirection OAuth (potentiellement journalisé par Google/Microsoft, un
// proxy, ou exposé via l'en-tête Referer). Même pattern que integrations.js.
// Jamais de valeur par défaut ici : un secret public rendrait la signature
// falsifiable par quiconque lit le code (répertoire désormais ouvert).
function signState(payload) {
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, sig })).toString('base64url');
}

function verifyState(raw) {
  const { payload, sig } = JSON.parse(Buffer.from(raw, 'base64url').toString());
  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(payload).digest('hex');
  if (sig !== expected) throw new Error('invalid_state');
  return JSON.parse(payload);
}

// ── OAuth constants ────────────────────────────────────────────────────────

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email';

const MS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const ONEDRIVE_SCOPE = 'Files.Read offline_access User.Read';

const FREQUENCY_DAYS = { '2_days': 2, '3_days': 3, '1_week': 7 };
const VALID_FREQUENCIES = Object.keys(FREQUENCY_DAYS);
const MAX_TEXT_CHARS = 40000;
const MAX_LOCAL_FILES = 50;

// ── Generic helpers ────────────────────────────────────────────────────────

async function extractText(buffer, mimeType, fileName) {
  const isPdf = mimeType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf');
  try {
    if (isPdf) {
      const text = await pdfToText(buffer);
      return (text || '').substring(0, MAX_TEXT_CHARS);
    } else {
      const result = await mammoth.extractRawText({ buffer });
      return (result.value || '').substring(0, MAX_TEXT_CHARS);
    }
  } catch {
    return '';
  }
}

async function getDipContext(userId) {
  const { data: dip } = await supabaseAdmin
    .from('dip_documents')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'actif')
    .maybeSingle();
  if (!dip) return null;

  const { data: secs } = await supabaseAdmin
    .from('dip_sections')
    .select('section_title, content')
    .eq('dip_id', dip.id)
    .order('section_number');
  if (!secs?.length) return null;

  return secs.map(s => `${s.section_title}: ${(s.content || '').substring(0, 400)}`).join('\n\n');
}

function nextCheckAt(frequency) {
  const days = FREQUENCY_DAYS[frequency] || 7;
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
}

async function processFileChange(monitorId, userId, fileId, fileName, mimeType, modifiedAt, hash, size, autoAnalyze, dipContext, isNew) {
  let summary = isNew ? `Nouveau document : ${fileName}` : `Document modifié : ${fileName}`;

  if (autoAnalyze && dipContext) {
    try {
      const text = summary; // placeholder — text extraction happens in caller
      if (text !== summary) {
        summary = await analyzeDocumentForDIPImpact(text, dipContext, fileName);
      }
    } catch { }
  }

  await supabaseAdmin.from('monitored_files').upsert({
    monitor_id: monitorId,
    user_id: userId,
    file_id: fileId,
    file_name: fileName,
    mime_type: mimeType || null,
    file_size: size ? parseInt(size) : null,
    last_modified: modifiedAt || null,
    content_hash: hash || null,
    last_analyzed_at: new Date().toISOString(),
    status: isNew ? 'new' : 'changed',
    change_summary: summary,
  }, { onConflict: 'monitor_id,file_id' });

  await supabaseAdmin.from('alerts').insert({
    user_id: userId,
    type: 'document_change',
    title: isNew ? `Nouveau document : ${fileName}` : `Document modifié : ${fileName}`,
    description: summary,
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  return summary;
}

// ── Google Drive helpers ───────────────────────────────────────────────────

async function getValidGoogleToken(monitor) {
  const bufferMs = 60 * 1000;
  if (monitor.token_expires_at && new Date(monitor.token_expires_at) > new Date(Date.now() + bufferMs)) {
    return decrypt(monitor.access_token);
  }
  const refreshToken = decrypt(monitor.refresh_token);
  if (!refreshToken || !process.env.GOOGLE_CLIENT_ID) return null;

  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    })
  });
  if (!resp.ok) return null;

  const tokens = await resp.json();
  const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
  await supabaseAdmin.from('document_monitors').update({
    access_token: encrypt(tokens.access_token),
    token_expires_at: expiresAt,
    ...(tokens.refresh_token ? { refresh_token: encrypt(tokens.refresh_token) } : {})
  }).eq('id', monitor.id);

  return tokens.access_token;
}

async function listDriveFiles(accessToken, folderId) {
  const mimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
  ];
  const mimeFilter = mimeTypes.map(m => `mimeType='${m}'`).join(' or ');
  const folderPart = folderId ? ` and '${folderId}' in parents` : '';
  const q = encodeURIComponent(`(${mimeFilter})${folderPart} and trashed=false`);

  const resp = await fetch(
    `${GOOGLE_DRIVE_BASE}/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,md5Checksum,size)&pageSize=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.files || [];
}

async function extractTextFromDriveFile(accessToken, fileId, mimeType) {
  const isGoogleDoc = mimeType === 'application/vnd.google-apps.document' || mimeType === 'application/vnd.google-apps.spreadsheet';
  const url = isGoogleDoc
    ? `${GOOGLE_DRIVE_BASE}/files/${fileId}/export?mimeType=application/pdf`
    : `${GOOGLE_DRIVE_BASE}/files/${fileId}?alt=media`;

  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) return '';

  const buffer = Buffer.from(await resp.arrayBuffer());
  return extractText(buffer, isGoogleDoc ? 'application/pdf' : mimeType, null);
}

// ── OneDrive helpers ───────────────────────────────────────────────────────

async function getValidOneDriveToken(monitor) {
  const bufferMs = 60 * 1000;
  if (monitor.token_expires_at && new Date(monitor.token_expires_at) > new Date(Date.now() + bufferMs)) {
    return decrypt(monitor.access_token);
  }
  const refreshToken = decrypt(monitor.refresh_token);
  if (!refreshToken || !process.env.MICROSOFT_CLIENT_ID) return null;

  const resp = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
      scope: ONEDRIVE_SCOPE,
    })
  });
  if (!resp.ok) return null;

  const tokens = await resp.json();
  const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
  await supabaseAdmin.from('document_monitors').update({
    access_token: encrypt(tokens.access_token),
    token_expires_at: expiresAt,
    ...(tokens.refresh_token ? { refresh_token: encrypt(tokens.refresh_token) } : {})
  }).eq('id', monitor.id);

  return tokens.access_token;
}

async function listOneDriveFiles(accessToken, folderId) {
  const endpoint = folderId
    ? `${GRAPH_BASE}/me/drive/items/${folderId}/children`
    : `${GRAPH_BASE}/me/drive/root/children`;

  const resp = await fetch(
    `${endpoint}?$select=id,name,lastModifiedDateTime,size,file,folder&$top=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) return [];
  const data = await resp.json();

  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  return (data.value || []).filter(item => {
    if (!item.file) return false;
    const mime = item.file.mimeType || '';
    return supportedTypes.some(t => mime.includes(t.split('/')[1])) ||
      item.name?.toLowerCase().match(/\.(pdf|docx|xlsx)$/);
  });
}

async function extractTextFromOneDriveFile(accessToken, itemId, mimeType, fileName) {
  const resp = await fetch(`${GRAPH_BASE}/me/drive/items/${itemId}/content`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!resp.ok) return '';
  const buffer = Buffer.from(await resp.arrayBuffer());
  return extractText(buffer, mimeType, fileName);
}

// ── Core check logic ───────────────────────────────────────────────────────

async function runGoogleDriveChecks(monitor, userId) {
  const accessToken = await getValidGoogleToken(monitor);
  if (!accessToken) return { changes: 0, files_checked: 0, error: 'Token invalide' };

  const driveFiles = await listDriveFiles(accessToken, monitor.folder_id);
  const { data: tracked } = await supabaseAdmin
    .from('monitored_files').select('*').eq('monitor_id', monitor.id);

  const trackedMap = Object.fromEntries((tracked || []).map(f => [f.file_id, f]));
  const dipContext = monitor.auto_analyze ? await getDipContext(userId) : null;

  let changedCount = 0;
  const tasks = [];

  for (const file of driveFiles) {
    const existing = trackedMap[file.id];
    const isNew = !existing;
    const isChanged = existing && file.md5Checksum && existing.content_hash !== file.md5Checksum;
    if (!isNew && !isChanged) continue;
    changedCount++;

    tasks.push((async () => {
      let summary = isNew ? `Nouveau document : ${file.name}` : `Document modifié : ${file.name}`;

      if (monitor.auto_analyze && dipContext) {
        try {
          const text = await extractTextFromDriveFile(accessToken, file.id, file.mimeType);
          if (text.length > 100) {
            summary = await analyzeDocumentForDIPImpact(text, dipContext, file.name);
          }
        } catch { }
      }

      await supabaseAdmin.from('monitored_files').upsert({
        monitor_id: monitor.id,
        user_id: userId,
        file_id: file.id,
        file_name: file.name,
        mime_type: file.mimeType,
        file_size: file.size ? parseInt(file.size) : null,
        last_modified: file.modifiedTime,
        content_hash: file.md5Checksum || null,
        last_analyzed_at: new Date().toISOString(),
        status: isNew ? 'new' : 'changed',
        change_summary: summary,
      }, { onConflict: 'monitor_id,file_id' });

      await supabaseAdmin.from('alerts').insert({
        user_id: userId,
        type: 'document_change',
        title: isNew ? `Nouveau document : ${file.name}` : `Document modifié : ${file.name}`,
        description: summary,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    })());
  }

  await Promise.allSettled(tasks);

  await supabaseAdmin.from('document_monitors').update({
    last_check_at: new Date().toISOString(),
    next_check_at: nextCheckAt(monitor.frequency),
  }).eq('id', monitor.id);

  return { changes: changedCount, files_checked: driveFiles.length };
}

async function runOneDriveChecks(monitor, userId) {
  const accessToken = await getValidOneDriveToken(monitor);
  if (!accessToken) return { changes: 0, files_checked: 0, error: 'Token invalide' };

  const odFiles = await listOneDriveFiles(accessToken, monitor.folder_id);
  const { data: tracked } = await supabaseAdmin
    .from('monitored_files').select('*').eq('monitor_id', monitor.id);

  const trackedMap = Object.fromEntries((tracked || []).map(f => [f.file_id, f]));
  const dipContext = monitor.auto_analyze ? await getDipContext(userId) : null;

  let changedCount = 0;
  const tasks = [];

  for (const item of odFiles) {
    const existing = trackedMap[item.id];
    const isNew = !existing;
    const itemHash = `${item.lastModifiedDateTime}_${item.size}`;
    const isChanged = existing && existing.content_hash !== itemHash;
    if (!isNew && !isChanged) continue;
    changedCount++;

    tasks.push((async () => {
      let summary = isNew ? `Nouveau document : ${item.name}` : `Document modifié : ${item.name}`;

      if (monitor.auto_analyze && dipContext) {
        try {
          const mime = item.file?.mimeType || '';
          const text = await extractTextFromOneDriveFile(accessToken, item.id, mime, item.name);
          if (text.length > 100) {
            summary = await analyzeDocumentForDIPImpact(text, dipContext, item.name);
          }
        } catch { }
      }

      await supabaseAdmin.from('monitored_files').upsert({
        monitor_id: monitor.id,
        user_id: userId,
        file_id: item.id,
        file_name: item.name,
        mime_type: item.file?.mimeType || null,
        file_size: item.size || null,
        last_modified: item.lastModifiedDateTime,
        content_hash: itemHash,
        last_analyzed_at: new Date().toISOString(),
        status: isNew ? 'new' : 'changed',
        change_summary: summary,
      }, { onConflict: 'monitor_id,file_id' });

      await supabaseAdmin.from('alerts').insert({
        user_id: userId,
        type: 'document_change',
        title: isNew ? `Nouveau document : ${item.name}` : `Document modifié : ${item.name}`,
        description: summary,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    })());
  }

  await Promise.allSettled(tasks);

  await supabaseAdmin.from('document_monitors').update({
    last_check_at: new Date().toISOString(),
    next_check_at: nextCheckAt(monitor.frequency),
  }).eq('id', monitor.id);

  return { changes: changedCount, files_checked: odFiles.length };
}

async function runChecksForUser(userId) {
  const { data: monitors } = await supabaseAdmin
    .from('document_monitors')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true);

  if (!monitors?.length) return { changes: 0, files_checked: 0 };

  let totalChanges = 0;
  let totalFiles = 0;

  for (const monitor of monitors) {
    if (monitor.source === 'local_folder') continue; // handled client-side
    try {
      let result = { changes: 0, files_checked: 0 };
      if (monitor.source === 'google_drive') result = await runGoogleDriveChecks(monitor, userId);
      else if (monitor.source === 'onedrive') result = await runOneDriveChecks(monitor, userId);
      totalChanges += result.changes || 0;
      totalFiles += result.files_checked || 0;
    } catch (err) {
      console.error(`Monitor check error source=${monitor.source}:`, err.message);
    }
  }

  return { changes: totalChanges, files_checked: totalFiles };
}

// ── Routes — Config ────────────────────────────────────────────────────────

router.get('/config', authMiddleware, requireFranchisor, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('document_monitors')
    .select('id,source,folder_id,folder_name,frequency,enabled,auto_analyze,last_check_at,next_check_at,drive_email')
    .eq('user_id', req.user.id);
  res.json({ monitors: data || [] });
});

router.put('/config/:id', authMiddleware, requireFranchisor, async (req, res) => {
  const { frequency, enabled, auto_analyze, folder_id, folder_name } = req.body;
  const updates = {};

  if (frequency !== undefined) {
    if (!VALID_FREQUENCIES.includes(frequency)) return res.status(400).json({ error: 'Fréquence invalide' });
    updates.frequency = frequency;
    updates.next_check_at = nextCheckAt(frequency);
  }
  if (enabled !== undefined) updates.enabled = Boolean(enabled);
  if (auto_analyze !== undefined) updates.auto_analyze = Boolean(auto_analyze);
  if (folder_id !== undefined) updates.folder_id = folder_id || null;
  if (folder_name !== undefined) updates.folder_name = folder_name || null;

  const { data, error } = await supabaseAdmin
    .from('document_monitors')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('id,source,folder_id,folder_name,frequency,enabled,auto_analyze,last_check_at,next_check_at,drive_email')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ monitor: data });
});

// ── Routes — Google Drive ──────────────────────────────────────────────────

router.get('/google/auth', authMiddleware, requireFranchisor, async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google Drive non configuré — ajoutez GOOGLE_CLIENT_ID dans Vercel' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ error: 'JWT_SECRET manquant — ajoutez-le dans Vercel' });
  }
  const redirectUri = `${process.env.BACKEND_URL || 'https://dippro.business'}/api/monitor/google/callback`;
  const state = signState(JSON.stringify({ userId: req.user.id }));
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: DRIVE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  res.json({ auth_url: `${GOOGLE_AUTH_URL}?${params}` });
});

router.get('/google/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;
  const frontendUrl = getAppUrl();
  if (oauthError || !code || !state) return res.redirect(`${frontendUrl}/monitor?error=oauth_denied`);

  let userId;
  try { ({ userId } = verifyState(String(state))); } catch { return res.redirect(`${frontendUrl}/monitor?error=invalid_session`); }

  try {
    const redirectUri = `${process.env.BACKEND_URL || 'https://dippro.business'}/api/monitor/google/callback`;
    const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, grant_type: 'authorization_code',
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
      })
    });
    if (!tokenResp.ok) return res.redirect(`${frontendUrl}/monitor?error=token_failed`);

    const tokens = await tokenResp.json();
    const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userInfo = userInfoResp.ok ? await userInfoResp.json() : {};

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    await supabaseAdmin.from('document_monitors').upsert({
      user_id: userId,
      source: 'google_drive',
      access_token: encrypt(tokens.access_token),
      refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
      token_expires_at: expiresAt,
      drive_email: userInfo.email || null,
      enabled: true,
      frequency: '1_week',
      next_check_at: nextCheckAt('1_week'),
    }, { onConflict: 'user_id,source' });

    res.redirect(`${frontendUrl}/monitor?connected=google`);
  } catch (err) {
    console.error('Google OAuth callback:', err.message);
    res.redirect(`${frontendUrl}/monitor?error=server_error`);
  }
});

router.delete('/google/disconnect', authMiddleware, requireFranchisor, async (req, res) => {
  await supabaseAdmin.from('document_monitors')
    .delete().eq('user_id', req.user.id).eq('source', 'google_drive');
  res.json({ message: 'Google Drive déconnecté' });
});

router.get('/google/folders', authMiddleware, requireFranchisor, async (req, res) => {
  const { data: monitor } = await supabaseAdmin
    .from('document_monitors').select('*')
    .eq('user_id', req.user.id).eq('source', 'google_drive').single();
  if (!monitor) return res.status(404).json({ error: 'Google Drive non connecté' });

  const accessToken = await getValidGoogleToken(monitor);
  if (!accessToken) return res.status(401).json({ error: 'Reconnectez Google Drive' });

  const resp = await fetch(
    `${GOOGLE_DRIVE_BASE}/files?q=${encodeURIComponent("mimeType='application/vnd.google-apps.folder' and trashed=false")}&fields=files(id,name)&pageSize=50&orderBy=name`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) return res.status(502).json({ error: 'Impossible de lister les dossiers' });
  const data = await resp.json();
  res.json({ folders: [{ id: null, name: 'Tout Mon Drive' }, ...(data.files || [])] });
});

// ── Routes — OneDrive ──────────────────────────────────────────────────────

router.get('/onedrive/auth', authMiddleware, requireFranchisor, async (req, res) => {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ error: 'JWT_SECRET manquant — ajoutez-le dans Vercel' });
  }
  if (!process.env.MICROSOFT_CLIENT_ID) {
    return res.status(503).json({ error: 'OneDrive non configuré — ajoutez MICROSOFT_CLIENT_ID dans Vercel' });
  }
  const redirectUri = `${process.env.BACKEND_URL || 'https://dippro.business'}/api/monitor/onedrive/callback`;
  const state = signState(JSON.stringify({ userId: req.user.id }));
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: ONEDRIVE_SCOPE,
    response_mode: 'query',
    state,
  });
  res.json({ auth_url: `${MS_AUTH_URL}?${params}` });
});

router.get('/onedrive/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;
  const frontendUrl = getAppUrl();
  if (oauthError || !code || !state) return res.redirect(`${frontendUrl}/monitor?error=oauth_denied`);

  let userId;
  try { ({ userId } = verifyState(String(state))); } catch { return res.redirect(`${frontendUrl}/monitor?error=invalid_session`); }

  try {
    const redirectUri = `${process.env.BACKEND_URL || 'https://dippro.business'}/api/monitor/onedrive/callback`;
    const tokenResp = await fetch(MS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, grant_type: 'authorization_code',
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        scope: ONEDRIVE_SCOPE,
      })
    });
    if (!tokenResp.ok) return res.redirect(`${frontendUrl}/monitor?error=token_failed`);

    const tokens = await tokenResp.json();
    const userInfoResp = await fetch(`${GRAPH_BASE}/me?$select=displayName,mail,userPrincipalName`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userInfo = userInfoResp.ok ? await userInfoResp.json() : {};

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    await supabaseAdmin.from('document_monitors').upsert({
      user_id: userId,
      source: 'onedrive',
      access_token: encrypt(tokens.access_token),
      refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
      token_expires_at: expiresAt,
      drive_email: userInfo.mail || userInfo.userPrincipalName || null,
      enabled: true,
      frequency: '1_week',
      next_check_at: nextCheckAt('1_week'),
    }, { onConflict: 'user_id,source' });

    res.redirect(`${frontendUrl}/monitor?connected=onedrive`);
  } catch (err) {
    console.error('OneDrive OAuth callback:', err.message);
    res.redirect(`${frontendUrl}/monitor?error=server_error`);
  }
});

router.delete('/onedrive/disconnect', authMiddleware, requireFranchisor, async (req, res) => {
  await supabaseAdmin.from('document_monitors')
    .delete().eq('user_id', req.user.id).eq('source', 'onedrive');
  res.json({ message: 'OneDrive déconnecté' });
});

router.get('/onedrive/folders', authMiddleware, requireFranchisor, async (req, res) => {
  const { data: monitor } = await supabaseAdmin
    .from('document_monitors').select('*')
    .eq('user_id', req.user.id).eq('source', 'onedrive').single();
  if (!monitor) return res.status(404).json({ error: 'OneDrive non connecté' });

  const accessToken = await getValidOneDriveToken(monitor);
  if (!accessToken) return res.status(401).json({ error: 'Reconnectez OneDrive' });

  const resp = await fetch(
    `${GRAPH_BASE}/me/drive/root/children?$select=id,name,folder&$top=50&$filter=folder ne null`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!resp.ok) {
    // fallback: list all children and filter
    const fallback = await fetch(`${GRAPH_BASE}/me/drive/root/children?$select=id,name,folder&$top=50`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!fallback.ok) return res.status(502).json({ error: 'Impossible de lister les dossiers' });
    const data = await fallback.json();
    const folders = (data.value || []).filter(i => i.folder);
    return res.json({ folders: [{ id: null, name: 'Tout Mon OneDrive' }, ...folders] });
  }

  const data = await resp.json();
  res.json({ folders: [{ id: null, name: 'Tout Mon OneDrive' }, ...(data.value || [])] });
});

// ── Routes — Dossier local (Mac / Windows) ─────────────────────────────────

router.post('/local/check', authMiddleware, requireFranchisor, async (req, res) => {
  const { folder_name, files } = req.body;
  if (!Array.isArray(files)) return res.status(400).json({ error: 'files requis' });

  const { data: existingMonitor } = await supabaseAdmin
    .from('document_monitors')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('source', 'local_folder')
    .maybeSingle();

  let monitor = existingMonitor;
  if (!monitor) {
    const { data: newMonitor, error } = await supabaseAdmin
      .from('document_monitors')
      .insert({
        user_id: req.user.id,
        source: 'local_folder',
        folder_name: folder_name || 'Dossier local',
        enabled: true,
        frequency: '1_week',
        auto_analyze: true,
        next_check_at: nextCheckAt('1_week'),
      })
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    monitor = newMonitor;
  } else if (folder_name && folder_name !== monitor.folder_name) {
    await supabaseAdmin.from('document_monitors').update({ folder_name }).eq('id', monitor.id);
    monitor.folder_name = folder_name;
  }

  const { data: tracked } = await supabaseAdmin
    .from('monitored_files').select('*').eq('monitor_id', monitor.id);
  const trackedMap = Object.fromEntries((tracked || []).map(f => [f.file_id, f]));

  const dipContext = monitor.auto_analyze ? await getDipContext(req.user.id) : null;

  let changedCount = 0;
  const tasks = [];

  for (const file of files.slice(0, MAX_LOCAL_FILES)) {
    const { name, content_base64, mime_type, hash, last_modified } = file;
    if (!name || !content_base64 || !hash) continue;

    const existing = trackedMap[name];
    const isNew = !existing;
    const isChanged = existing && existing.content_hash !== hash;
    if (!isNew && !isChanged) continue;
    changedCount++;

    tasks.push((async () => {
      let summary = isNew ? `Nouveau document : ${name.split('/').pop()}` : `Document modifié : ${name.split('/').pop()}`;

      if (monitor.auto_analyze && dipContext) {
        try {
          const buffer = Buffer.from(content_base64, 'base64');
          const text = await extractText(buffer, mime_type, name);
          if (text.length > 100) {
            summary = await analyzeDocumentForDIPImpact(text, dipContext, name.split('/').pop());
          }
        } catch { }
      }

      const displayName = name.split('/').pop();
      await supabaseAdmin.from('monitored_files').upsert({
        monitor_id: monitor.id,
        user_id: req.user.id,
        file_id: name,
        file_name: displayName,
        mime_type: mime_type || null,
        last_modified: last_modified || null,
        content_hash: hash,
        last_analyzed_at: new Date().toISOString(),
        status: isNew ? 'new' : 'changed',
        change_summary: summary,
      }, { onConflict: 'monitor_id,file_id' });

      await supabaseAdmin.from('alerts').insert({
        user_id: req.user.id,
        type: 'document_change',
        title: isNew ? `Nouveau document : ${displayName}` : `Document modifié : ${displayName}`,
        description: summary,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    })());
  }

  await Promise.allSettled(tasks);

  await supabaseAdmin.from('document_monitors').update({
    last_check_at: new Date().toISOString(),
    next_check_at: nextCheckAt(monitor.frequency || '1_week'),
  }).eq('id', monitor.id);

  res.json({ changes: changedCount, files_checked: files.length, monitor_id: monitor.id });
});

router.delete('/local/disconnect', authMiddleware, requireFranchisor, async (req, res) => {
  await supabaseAdmin.from('document_monitors')
    .delete().eq('user_id', req.user.id).eq('source', 'local_folder');
  res.json({ message: 'Dossier local déconnecté' });
});

// ── Routes — DIPpro Vault (Supabase Storage, zéro config) ─────────────────

router.post('/vault/sync', authMiddleware, requireFranchisor, async (req, res) => {
  const { files } = req.body;
  if (!Array.isArray(files)) return res.status(400).json({ error: 'files requis' });

  let { data: monitor } = await supabaseAdmin
    .from('document_monitors').select('*')
    .eq('user_id', req.user.id).eq('source', 'vault').maybeSingle();

  if (!monitor) {
    const { data, error } = await supabaseAdmin
      .from('document_monitors')
      .insert({
        user_id: req.user.id, source: 'vault', folder_name: 'DIPpro Vault',
        enabled: true, frequency: '1_week', auto_analyze: true,
        next_check_at: nextCheckAt('1_week'),
      })
      .select('*').single();
    if (error) return res.status(500).json({ error: error.message });
    monitor = data;
  }

  const { data: tracked } = await supabaseAdmin
    .from('monitored_files').select('*').eq('monitor_id', monitor.id);
  const trackedMap = Object.fromEntries((tracked || []).map(f => [f.file_id, f]));
  const dipContext = monitor.auto_analyze ? await getDipContext(req.user.id) : null;

  let changedCount = 0;
  const tasks = [];

  for (const file of files.slice(0, 50)) {
    const { storage_path, file_name, hash, size, last_modified, mime_type } = file;
    if (!storage_path || !hash) continue;
    if (!storage_path.startsWith(req.user.id + '/')) continue; // sécurité

    const existing = trackedMap[storage_path];
    const isNew = !existing;
    const isChanged = existing && existing.content_hash !== hash;
    if (!isNew && !isChanged) continue;
    changedCount++;

    tasks.push((async () => {
      let summary = isNew ? `Nouveau document : ${file_name}` : `Document modifié : ${file_name}`;

      if (monitor.auto_analyze && dipContext) {
        try {
          const { data: blob, error } = await supabaseAdmin.storage.from('vault').download(storage_path);
          if (!error && blob) {
            const buffer = Buffer.from(await blob.arrayBuffer());
            const text = await extractText(buffer, mime_type, file_name);
            if (text.length > 100) {
              summary = await analyzeDocumentForDIPImpact(text, dipContext, file_name);
            }
          }
        } catch { }
      }

      await supabaseAdmin.from('monitored_files').upsert({
        monitor_id: monitor.id, user_id: req.user.id,
        file_id: storage_path, file_name,
        mime_type: mime_type || null, file_size: size || null,
        last_modified: last_modified || null, content_hash: hash,
        last_analyzed_at: new Date().toISOString(),
        status: isNew ? 'new' : 'changed', change_summary: summary,
      }, { onConflict: 'monitor_id,file_id' });

      await supabaseAdmin.from('alerts').insert({
        user_id: req.user.id, type: 'document_change',
        title: isNew ? `Nouveau document : ${file_name}` : `Document modifié : ${file_name}`,
        description: summary, status: 'pending',
        created_at: new Date().toISOString(),
      });
    })());
  }

  await Promise.allSettled(tasks);
  await supabaseAdmin.from('document_monitors').update({
    last_check_at: new Date().toISOString(),
  }).eq('id', monitor.id);

  res.json({ changes: changedCount, files_checked: files.length });
});

router.delete('/vault/file', authMiddleware, requireFranchisor, async (req, res) => {
  const { storage_path } = req.body;
  if (!storage_path) return res.status(400).json({ error: 'storage_path requis' });
  if (!storage_path.startsWith(req.user.id + '/')) return res.status(403).json({ error: 'Accès refusé' });

  await supabaseAdmin.storage.from('vault').remove([storage_path]);

  const { data: monitor } = await supabaseAdmin
    .from('document_monitors').select('id')
    .eq('user_id', req.user.id).eq('source', 'vault').maybeSingle();
  if (monitor) {
    await supabaseAdmin.from('monitored_files')
      .delete().eq('monitor_id', monitor.id).eq('file_id', storage_path);
  }
  res.json({ message: 'Fichier supprimé' });
});

router.delete('/vault/disconnect', authMiddleware, requireFranchisor, async (req, res) => {
  const { data: fileList } = await supabaseAdmin.storage.from('vault').list(req.user.id + '/');
  if (fileList?.length) {
    await supabaseAdmin.storage.from('vault').remove(fileList.map(f => `${req.user.id}/${f.name}`));
  }
  await supabaseAdmin.from('document_monitors')
    .delete().eq('user_id', req.user.id).eq('source', 'vault');
  res.json({ message: 'DIPpro Vault vidé' });
});

// ── Routes — Fichiers & vérification ──────────────────────────────────────

router.get('/files', authMiddleware, requireFranchisor, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('monitored_files')
    .select('id,file_name,mime_type,file_size,last_modified,status,change_summary,last_analyzed_at')
    .eq('user_id', req.user.id)
    .order('last_modified', { ascending: false })
    .limit(100);
  res.json({ files: data || [] });
});

router.post('/check-now', authMiddleware, requireFranchisor, async (req, res) => {
  try {
    const result = await runChecksForUser(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/monitor/run — endpoint cron Vercel
router.get('/run', async (req, res) => {
  const secret = process.env.MONITOR_CRON_SECRET;
  if (secret) {
    if (req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Fail-closed en production : sans secret configuré, ce endpoint public
    // pourrait être déclenché par n'importe qui pour tous les utilisateurs.
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: due } = await supabaseAdmin
    .from('document_monitors')
    .select('user_id')
    .eq('enabled', true)
    .not('source', 'eq', 'local_folder')
    .lte('next_check_at', new Date().toISOString());

  if (!due?.length) return res.json({ checked: 0 });

  const userIds = [...new Set(due.map(d => d.user_id))];
  let totalChanges = 0;
  for (const userId of userIds) {
    try {
      const r = await runChecksForUser(userId);
      totalChanges += r.changes || 0;
    } catch (err) {
      console.error(`Monitor cron error user=${userId}:`, err.message);
    }
  }
  res.json({ checked: userIds.length, totalChanges });
});

module.exports = router;
