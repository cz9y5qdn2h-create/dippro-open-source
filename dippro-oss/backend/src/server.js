require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const dipRoutes = require('./routes/dip');
const contractRoutes = require('./routes/contracts');
const alertRoutes = require('./routes/alerts');
const franchiseeRoutes = require('./routes/franchisees');
const exportRoutes = require('./routes/export');
const historyRoutes = require('./routes/history');
const settingsRoutes = require('./routes/settings');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const agentRoutes = require('./routes/agent');
const waitlistRoutes = require('./routes/waitlist');
const monitorRoutes      = require('./routes/monitor');
const certificateRoutes  = require('./routes/certificates');
const analyticsRoutes    = require('./routes/analytics');
const monitoringRoutes   = require('./routes/monitoring');
const copilotRoutes      = require('./routes/copilot');
const onboardingRoutes   = require('./routes/onboarding');
const avocatRoutes       = require('./routes/avocat');
const complianceRoutes   = require('./routes/compliance');
const cronRoutes          = require('./routes/cron');
const feedbackRoutes      = require('./routes/feedback');
const bugRoutes           = require('./routes/bugs');
const documentRoutes      = require('./routes/documents');
const contactRoutes       = require('./routes/contact');
const leadsRoutes         = require('./routes/leads');
const outreachRoutes      = require('./routes/outreach');

const app = express();

// Nécessaire sur Vercel (proxy) sinon express-rate-limit bloque tout
app.set('trust proxy', 1);

// Compression gzip/br — réduit les réponses JSON de ~70%
app.use(compression({ threshold: 512 }));

// En-têtes de sécurité
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS restreint aux origines autorisées. Si ALLOWED_ORIGINS n'est pas
// configurée sur Vercel, on retombait sur "aucune restriction" — un CORS
// wildcard combiné à credentials:true, qui laisse n'importe quel site tiers
// faire des requêtes authentifiées au nom d'un visiteur. Le repli est
// désormais le domaine de production connu plutôt qu'un accès total.
const DEFAULT_ALLOWED_ORIGINS = ['https://iralink-agency.dippro.business'];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
const effectiveOrigins = ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : DEFAULT_ALLOWED_ORIGINS;
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / SSR / mobile
    if (effectiveOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origine non autorisée'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());

// Rate limiters spécifiques — actifs en toutes conditions
const agentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes IA. Réessayez dans 15 minutes.' }
});

const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives d\'inscription. Réessayez dans une heure.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' }
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de messages envoyés. Réessayez dans une heure.' }
});

const leadsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de demandes envoyées. Réessayez dans une heure.' }
});

// Rate limiting global en production
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes. Réessayez dans 15 minutes.' }
  });
  app.use('/api/', limiter);
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/dip', dipRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/franchisees', franchiseeRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/agent', agentLimiter, agentRoutes);
app.use('/api/waitlist', waitlistLimiter, waitlistRoutes);
app.use('/api/monitor',       monitorRoutes);
app.use('/api/certificates',  certificateRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/monitoring',    monitoringRoutes);
app.use('/api/copilot',       copilotRoutes);
app.use('/api/onboarding',    onboardingRoutes);
app.use('/api/avocat',        avocatRoutes);
app.use('/api/compliance',    complianceRoutes);
app.use('/api/cron',          cronRoutes);
app.use('/api/feedback',      feedbackRoutes);
app.use('/api/bugs',          bugRoutes);
app.use('/api/documents',     documentRoutes);
app.use('/api/contact',       contactLimiter, contactRoutes);
app.use('/api/leads',         leadsLimiter, leadsRoutes);
app.use('/api/outreach',      outreachRoutes);

// Health check — ne retourne jamais les clés en clair
app.get('/api/health', async (req, res) => {
  const checks = {
    supabase_url: { ok: !!process.env.SUPABASE_URL },
    supabase_anon_key: { ok: !!process.env.SUPABASE_ANON_KEY },
    supabase_service_role: { ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
    anthropic_key: { ok: !!process.env.ANTHROPIC_API_KEY }
  };

  try {
    const { supabaseAdmin } = require('./config/supabase');
    const { error } = await supabaseAdmin.from('users').select('id').limit(1);
    checks.supabase_admin_query = { ok: !error, error: error?.message || null };
  } catch (e) {
    checks.supabase_admin_query = { ok: false, error: e.message };
  }

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    await c.models.list();
    checks.anthropic_ping = { ok: true };
  } catch (e) {
    checks.anthropic_ping = { ok: false, error: e.message, status: e.status || null };
  }

  // Détecte une migration présente dans le repo mais jamais appliquée en
  // production — dérive qui fait échouer des écritures silencieusement.
  try {
    const { checkSchema } = require('./config/schemaCheck');
    const schema = await checkSchema();
    checks.database_schema = schema.ok
      ? { ok: true }
      : { ok: false, error: 'Colonnes manquantes — migration non appliquée', missing: schema.missing };
  } catch (e) {
    checks.database_schema = { ok: false, error: e.message };
  }

  const allOk = Object.values(checks).every(c => c.ok);
  res.status(allOk ? 200 : 500).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks
  });
});

app.get('/', (req, res) => {
  res.json({ name: 'DIP Pilot API', version: '1.0.0', status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// Erreurs globales
app.use((err, req, res, next) => {
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Erreur interne' });
});

// Export pour Vercel serverless
module.exports = app;

// Démarrage local uniquement
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log('DIP Pilot API sur port ' + PORT));
}
