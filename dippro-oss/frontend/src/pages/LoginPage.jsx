import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import usePageBackground from '../lib/usePageBackground';

const AUTH_BG = `
  radial-gradient(ellipse 55% 50% at 15% 70%, rgba(156,65,65,0.20) 0%, transparent 60%),
  radial-gradient(ellipse 40% 60% at 80% 20%, rgba(130,50,50,0.14) 0%, transparent 55%),
  radial-gradient(ellipse 60% 40% at 60% 85%, rgba(110,44,44,0.10) 0%, transparent 60%),
  linear-gradient(160deg, #0a0805 0%, #0f0d08 25%, #080808 55%, #060606 100%)
`;

export default function LoginPage() {
  usePageBackground(AUTH_BG);
  const { login, verifyMFA } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaStep, setMfaStep] = useState(null); // { factorId }
  const [mfaCode, setMfaCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(form.email, form.password);
      if (result?.mfaRequired) {
        setMfaStep({ factorId: result.factorId });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('fetch') || msg.includes('Invalid value') || msg.includes('Failed to')) {
        setError(t('auth.login.errors.config'));
      } else if (msg.includes('Invalid login') || msg.includes('Identifiants')) {
        setError(t('auth.login.errors.invalid'));
      } else {
        setError(msg || t('auth.login.errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyMFA(mfaStep.factorId, mfaCode.replace(/\s/g, ''));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Code incorrect.');
      setMfaCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Connexion"
        description="Connectez-vous à DIPpro pour gérer la conformité de votre Document d'Information Précontractuelle (DIP franchise). Analyse IA Loi Doubin pour franchiseurs français."
        canonical="/login"
        noindex={true}
      />
    <div className="min-h-screen flex" style={{ background: AUTH_BG }}>

      {/* Panneau gauche — branding */}
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12" style={{
        background: 'rgba(8,8,8,0.60)',
        backdropFilter: 'blur(40px)',
        borderRight: '0.5px solid rgba(156,65,65,0.10)'
      }}>
        <div className="flex items-center gap-3">
          <div className="lg-avatar">
            <Shield className="w-4 h-4" style={{ color: '#9C4141' }} />
          </div>
          <div>
            <p className="font-cormorant text-xl" style={{ color: '#F4F2EE' }}>DIPpro</p>
            <p className="font-dm-mono text-xs" style={{ color: 'rgba(244,242,238,0.35)' }}>by Iralink</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <p className="font-cormorant text-4xl leading-snug mb-4" style={{ color: '#F4F2EE', fontWeight: 300 }}>
              {t('auth.login.tagline')}
            </p>
            <p className="font-dm-sans text-sm leading-relaxed" style={{ color: 'rgba(244,242,238,0.45)' }}>
              {t('auth.login.taglineDesc')}
            </p>
          </div>

          {t('auth.login.features', { returnObjects: true }).map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#9C4141' }} />
              <span className="font-dm-sans text-sm" style={{ color: 'rgba(244,242,238,0.60)' }}>{item}</span>
            </div>
          ))}
        </div>

        <p className="font-dm-mono text-xs" style={{ color: 'rgba(244,242,238,0.22)' }}>
          Art. L.330-3 Code de commerce
        </p>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="lg-avatar">
              <Shield className="w-4 h-4" style={{ color: '#9C4141' }} />
            </div>
            <p className="font-cormorant text-xl" style={{ color: '#F4F2EE' }}>DIPpro</p>
          </div>

          <div className="mb-8">
            <h1 className="font-cormorant text-3xl mb-1" style={{ color: '#F4F2EE', fontWeight: 300 }}>{t('auth.login.title')}</h1>
            <p className="font-dm-sans text-sm" style={{ color: 'rgba(244,242,238,0.44)' }}>
              {t('auth.login.subtitle')}{' '}
              <Link to="/register" className="font-medium" style={{ color: '#9C4141' }}>
                {t('auth.login.startTrial')}
              </Link>
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 mb-5 font-dm-sans text-sm" style={{
              background: 'rgba(248,113,113,0.08)',
              border: '0.5px solid rgba(248,113,113,0.25)',
              color: '#F87171'
            }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {mfaStep ? (
            /* ── Étape A2F ── */
            <form onSubmit={handleMFAVerify} className="space-y-4">
              <div className="rounded-xl px-4 py-4 mb-2" style={{
                background: 'rgba(156,65,65,0.06)',
                border: '0.5px solid rgba(156,65,65,0.20)',
              }}>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4" style={{ color: '#9C4141' }} />
                  <span className="font-dm-sans text-sm font-medium" style={{ color: '#9C4141' }}>
                    Vérification en deux étapes
                  </span>
                </div>
                <p className="font-dm-sans text-xs" style={{ color: 'rgba(244,242,238,0.45)' }}>
                  Ouvrez votre application d'authentification et entrez le code à 6 chiffres.
                </p>
              </div>

              <div>
                <label className="lg-label">Code A2F</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9 ]*"
                  maxLength={7}
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  placeholder="123 456"
                  required
                  autoFocus
                  className="lg-input text-center tracking-widest"
                  style={{ fontSize: 22, letterSpacing: '0.3em' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || mfaCode.replace(/\s/g, '').length < 6}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-dm-sans text-sm transition-all"
                style={{
                  background: 'rgba(156,65,65,0.16)',
                  border: '0.5px solid rgba(156,65,65,0.42)',
                  color: '#9C4141', fontWeight: 500,
                  cursor: loading || mfaCode.replace(/\s/g, '').length < 6 ? 'not-allowed' : 'pointer',
                  opacity: mfaCode.replace(/\s/g, '').length < 6 ? 0.5 : 1,
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Vérification…
                  </span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Confirmer
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMfaStep(null); setMfaCode(''); setError(''); }}
                className="w-full font-dm-sans text-xs text-center py-2 transition-colors"
                style={{ color: 'rgba(244,242,238,0.30)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ← Retour
              </button>
            </form>
          ) : (
            /* ── Formulaire principal ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="lg-label">{t('auth.login.email')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder={t('auth.login.emailPlaceholder')}
                  required
                  autoComplete="email"
                  className="lg-input"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="lg-label" style={{ marginBottom: 0 }}>{t('auth.login.password')}</label>
                  <Link
                    to="/forgot-password"
                    className="font-dm-sans text-xs transition-colors"
                    style={{ color: 'rgba(156,65,65,0.55)' }}
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="lg-input"
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'rgba(244,242,238,0.35)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !form.email || !form.password}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-dm-sans text-sm transition-all mt-2"
                style={{
                  background: loading || !form.email || !form.password
                    ? 'rgba(156,65,65,0.25)'
                    : 'rgba(156,65,65,0.16)',
                  border: `0.5px solid ${loading || !form.email || !form.password ? 'rgba(156,65,65,0.20)' : 'rgba(156,65,65,0.42)'}`,
                  color: loading || !form.email || !form.password ? 'rgba(156,65,65,0.50)' : '#9C4141',
                  cursor: loading || !form.email || !form.password ? 'not-allowed' : 'pointer',
                  fontWeight: 500
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {t('auth.login.loading')}
                  </span>
                ) : (
                  <>
                    {t('auth.login.submit')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <p className="font-dm-sans text-xs text-center mt-6 leading-relaxed" style={{ color: 'rgba(244,242,238,0.30)' }}>
            {t('auth.login.consent')}{' '}
            <Link to="/cgu" className="underline underline-offset-2 transition-colors" style={{ color: 'rgba(156,65,65,0.60)' }}>
              {t('auth.login.consentCgu')}
            </Link>
            {', '}
            <Link to="/privacy" className="underline underline-offset-2 transition-colors" style={{ color: 'rgba(156,65,65,0.60)' }}>
              {t('auth.login.consentPrivacy')}
            </Link>
            {' '}{t('auth.login.consentLegal') !== 'legal notice' ? 'et les' : 'and the'}{' '}
            <Link to="/mentions-legales" className="underline underline-offset-2 transition-colors" style={{ color: 'rgba(156,65,65,0.60)' }}>
              {t('auth.login.consentLegal')}
            </Link>
            {' '}{t('auth.login.consentOf')}
          </p>
          <p className="font-dm-mono text-xs text-center mt-3" style={{ color: 'rgba(244,242,238,0.15)' }}>
            {t('common.security')}
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
