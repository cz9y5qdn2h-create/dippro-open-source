const crypto = require('crypto');

let KEY;
let warned = false;
function getKey() {
  if (KEY) return KEY;
  const raw = process.env.MONITOR_ENCRYPTION_KEY;
  if (raw && raw.length === 64) {
    KEY = Buffer.from(raw, 'hex');
  } else {
    // SUPABASE_URL n'est PAS un secret — c'est la même valeur que
    // VITE_SUPABASE_URL, bakée en clair dans le bundle frontend. La dériver
    // pour chiffrer des tokens OAuth (Google Drive/OneDrive) annule tout
    // l'intérêt du chiffrement : quiconque lit le bundle public peut
    // recalculer cette clé. Conservé uniquement en repli temporaire pour ne
    // pas casser le déchiffrement des tokens déjà stockés — configurez
    // MONITOR_ENCRYPTION_KEY (32 octets aléatoires en hex) dès que possible ;
    // les intégrations déjà connectées devront être reconnectées une fois la
    // vraie clé en place (les anciens tokens resteront chiffrés avec l'ancienne clé).
    if (!warned) {
      console.error('[SECURITY] MONITOR_ENCRYPTION_KEY absente — repli sur une clé dérivée de SUPABASE_URL (non secrète). Configurez MONITOR_ENCRYPTION_KEY en production.');
      warned = true;
    }
    const seed = process.env.SUPABASE_URL || 'dippro-dev-fallback-key-32-bytes!!';
    KEY = crypto.createHash('sha256').update(seed).digest();
  }
  return KEY;
}

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(encryptedText) {
  if (!encryptedText) return null;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { encrypt, decrypt };
