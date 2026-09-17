import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, Building2, Scale } from 'lucide-react';
import toast from 'react-hot-toast';
import OnboardingFranchiseur from '../components/OnboardingFranchiseur';
import OnboardingAvocat from '../components/OnboardingAvocat';
import SEOHead from '../components/SEOHead';
import usePageBackground from '../lib/usePageBackground';

const STEP_COUNT = 3;

const AUTH_BG = `
  radial-gradient(ellipse 55% 50% at 15% 70%, rgba(156,65,65,0.20) 0%, transparent 60%),
  radial-gradient(ellipse 40% 60% at 80% 20%, rgba(130,50,50,0.14) 0%, transparent 55%),
  radial-gradient(ellipse 60% 40% at 60% 85%, rgba(110,44,44,0.10) 0%, transparent 60%),
  linear-gradient(160deg, #0a0805 0%, #0f0d08 25%, #080808 55%, #060606 100%)
`;

export default function RegisterPage() {
  usePageBackground(AUTH_BG);
  const { register } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // DIPpro se vend désormais aux avocats — un compte franchiseur ne se crée
  // plus en libre-service, uniquement par invitation de son avocat (espace
  // avocat > "Inviter un client franchiseur", sans mot de passe à définir).
  // ?role=franchiseur reste accepté pour un lien d'invitation existant.
  const [selectedRole, setSelectedRole] = useState(
    searchParams.get('role') === 'franchiseur' ? 'franchiseur' : 'avocat'
  );
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    company_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
  });
  const [consents, setConsents] = useState({
    terms: false,
    aiDisclaimer: false,
    marketing: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [onboardingProfile, setOnboardingProfile] = useState(null);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const passwordStrength = (pwd) => {
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    return s;
  };
  const strength = passwordStrength(form.password);
  const strengthColors = ['#EF4444', '#EF4444', '#FBBF24', '#9C4141', '#34D399'];
  const strengthLabels = ['', t('auth.register.passwordStrength.weak'), t('auth.register.passwordStrength.medium'), t('auth.register.passwordStrength.good'), t('auth.register.passwordStrength.excellent')];

  const companyLabel = selectedRole === 'avocat' ? 'Nom du cabinet' : t('auth.register.fields.companyName');
  const companyPlaceholder = selectedRole === 'avocat' ? 'Dupont & Associés' : t('auth.register.fields.companyNamePlaceholder');

  const nextStep = () => {
    if (step === 0 && !form.company_name.trim()) return setError(companyLabel + ' requis');
    if (step === 1 && !form.email.trim()) return setError(t('auth.register.fields.email') + ' requis');
    setError('');
    setStep(s => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return setError(t('auth.register.errors.passwordMismatch'));
    if (strength < 2) return setError(t('auth.register.errors.passwordTooShort'));
    if (!consents.terms) return setError(t('auth.register.errors.acceptCgu'));
    if (!consents.aiDisclaimer) return setError(t('auth.register.errors.acceptAi'));
    setLoading(true);
    try {
      await register(form.email, form.password, form.company_name, form.phone_number, {
        marketing_consent: consents.marketing,
        ai_disclaimer_accepted: consents.aiDisclaimer,
        role: selectedRole || 'franchiseur',
      });
      toast.success('Compte créé ! Votre essai gratuit de 5 jours commence maintenant.');
      setOnboardingProfile({ company_name: form.company_name, role: selectedRole });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    navigate('/dashboard');
  };

  return (
    <>
      <SEOHead
        title="Créer un compte"
        description="Créez votre compte avocat DIPpro et centralisez la conformité DIP de tous vos clients franchiseurs. Analyse Loi Doubin, attestations horodatées SHA-256."
        canonical="/register"
      />
      <div className="min-h-screen flex" style={{ background: AUTH_BG }}>

        {/* Panneau gauche */}
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

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {selectedRole === 'avocat'
                  ? <Scale className="w-4 h-4" style={{ color: '#9C4141' }} />
                  : <Building2 className="w-4 h-4" style={{ color: '#9C4141' }} />
                }
                <p className="font-dm-mono text-xs" style={{ color: '#9C4141', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                  {selectedRole === 'avocat' ? 'Compte avocat' : t('auth.register.trialBadge')}
                </p>
              </div>
              <p className="font-cormorant text-4xl leading-snug mb-4" style={{ color: '#F4F2EE', fontWeight: 300 }}>
                {selectedRole === 'avocat' ? 'Tous vos clients franchiseurs, une seule vue de conformité.' : t('auth.register.tagline')}
              </p>
            </div>
            {(selectedRole === 'avocat'
              ? ['Score de conformité en direct par client', 'Vous confirmez chaque modification du franchiseur', 'Compte-rendu automatique par email']
              : t('auth.register.benefits', { returnObjects: true })
            ).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#34D399' }} />
                <span className="font-dm-sans text-sm" style={{ color: 'rgba(244,242,238,0.60)' }}>{item}</span>
              </div>
            ))}
          </div>

          <p className="font-dm-mono text-xs" style={{ color: 'rgba(244,242,238,0.22)' }}>
            Art. L.330-3 Code de commerce
          </p>
        </div>

        {/* Panneau droit */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">

            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div className="lg-avatar">
                <Shield className="w-4 h-4" style={{ color: '#9C4141' }} />
              </div>
              <p className="font-cormorant text-xl" style={{ color: '#F4F2EE' }}>DIPpro</p>
            </div>

            <div className="mb-7">
              {selectedRole === 'avocat' && (
                <p className="font-dm-mono text-xs mb-2" style={{ color: 'rgba(244,242,238,0.35)' }}>
                  Vous êtes franchiseur ? Demandez à votre avocat de vous inviter depuis son espace DIPpro.
                </p>
              )}
              <h1 className="font-cormorant text-3xl mb-1" style={{ color: '#F4F2EE', fontWeight: 300 }}>
                {selectedRole === 'avocat' ? 'Compte avocat' : t('auth.register.title')}
              </h1>
              <p className="font-dm-sans text-sm" style={{ color: 'rgba(244,242,238,0.44)' }}>
                {t('auth.register.subtitle')}{' '}
                <Link to="/login" className="font-medium" style={{ color: '#9C4141' }}>{t('auth.register.login')}</Link>
              </p>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2 mb-7">
              {[companyLabel, t('auth.register.steps.contact'), t('auth.register.steps.security')].map((label, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center transition-all" style={{
                      background: i < step ? 'rgba(52,211,153,0.20)' : i === step ? 'rgba(156,65,65,0.20)' : 'rgba(244,242,238,0.06)',
                      border: i < step ? '0.5px solid rgba(52,211,153,0.40)' : i === step ? '0.5px solid rgba(156,65,65,0.40)' : '0.5px solid rgba(244,242,238,0.12)',
                      color: i < step ? '#34D399' : i === step ? '#9C4141' : 'rgba(244,242,238,0.30)',
                      fontSize: 11,
                      fontFamily: 'DM Mono, monospace'
                    }}>
                      {i < step ? '✓' : i + 1}
                    </div>
                    <span className="font-dm-sans text-xs hidden sm:block" style={{
                      color: i === step ? '#F4F2EE' : 'rgba(244,242,238,0.35)'
                    }}>{label}</span>
                  </div>
                  {i < STEP_COUNT - 1 && (
                    <div className="flex-1 h-px" style={{
                      background: i < step ? 'rgba(52,211,153,0.30)' : 'rgba(244,242,238,0.08)'
                    }} />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 mb-4 font-dm-sans text-sm" style={{
                background: 'rgba(248,113,113,0.08)',
                border: '0.5px solid rgba(248,113,113,0.25)',
                color: '#F87171'
              }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={step < 2 ? (e) => { e.preventDefault(); nextStep(); } : handleSubmit} className="space-y-4">

              {/* Étape 0 — Société / Cabinet */}
              {step === 0 && (
                <div>
                  <label className="lg-label">{companyLabel}</label>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={e => set('company_name', e.target.value)}
                    placeholder={companyPlaceholder}
                    required
                    autoFocus
                    className="lg-input"
                  />
                  <p className="font-dm-sans text-xs mt-1.5" style={{ color: 'rgba(244,242,238,0.30)' }}>
                    {t('auth.register.fields.companyNameHelper')}
                  </p>
                </div>
              )}

              {/* Étape 1 — Contact */}
              {step === 1 && (
                <>
                  <div>
                    <label className="lg-label">{t('auth.register.fields.email')}</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      placeholder={t('auth.register.fields.emailPlaceholder')}
                      required
                      autoFocus
                      autoComplete="email"
                      className="lg-input"
                    />
                  </div>
                  <div>
                    <label className="lg-label">
                      {t('auth.register.fields.phone')} <span style={{ color: 'rgba(244,242,238,0.28)', textTransform: 'none', fontSize: 10 }}>(optionnel)</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone_number}
                      onChange={e => set('phone_number', e.target.value)}
                      placeholder={t('auth.register.fields.phonePlaceholder')}
                      autoComplete="tel"
                      className="lg-input"
                    />
                  </div>
                </>
              )}

              {/* Étape 2 — Sécurité */}
              {step === 2 && (
                <>
                  <div>
                    <label className="lg-label">{t('auth.register.fields.password')}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => set('password', e.target.value)}
                        placeholder="••••••••"
                        required
                        autoFocus
                        autoComplete="new-password"
                        className="lg-input"
                        style={{ paddingRight: '44px' }}
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(244,242,238,0.35)' }}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-0.5 flex-1 rounded-full transition-all" style={{
                              background: i <= strength ? strengthColors[strength] : 'rgba(244,242,238,0.08)'
                            }} />
                          ))}
                        </div>
                        <p className="font-dm-mono text-xs" style={{ color: strengthColors[strength], fontSize: 10 }}>
                          {strengthLabels[strength]}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="lg-label">{t('auth.register.fields.confirmPassword')}</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={e => set('confirmPassword', e.target.value)}
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                        className="lg-input"
                        style={{
                          paddingRight: '44px',
                          borderColor: form.confirmPassword
                            ? form.password === form.confirmPassword
                              ? 'rgba(52,211,153,0.45)'
                              : 'rgba(248,113,113,0.45)'
                            : undefined
                        }}
                      />
                      {form.confirmPassword && form.password === form.confirmPassword && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#34D399' }} />
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Consentements — étape 2 */}
              {step === 2 && (
                <div className="space-y-3 pt-1">
                  <ConsentCheckbox
                    id="consent-terms"
                    checked={consents.terms}
                    onChange={v => setConsents(c => ({ ...c, terms: v }))}
                    label={t('auth.register.consent.cgu') + ' *'}
                  />
                  <ConsentCheckbox
                    id="consent-ai"
                    checked={consents.aiDisclaimer}
                    onChange={v => setConsents(c => ({ ...c, aiDisclaimer: v }))}
                    label={t('auth.register.consent.ai') + ' *'}
                  />
                  <ConsentCheckbox
                    id="consent-marketing"
                    checked={consents.marketing}
                    onChange={v => setConsents(c => ({ ...c, marketing: v }))}
                    label={t('auth.register.consent.marketing')}
                  />
                  <p className="font-dm-mono" style={{ fontSize: 10, color: 'rgba(244,242,238,0.28)' }}>* Champs obligatoires</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (step === 2 && (!consents.terms || !consents.aiDisclaimer))}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-dm-sans text-sm transition-all"
                style={{
                  background: loading || (step === 2 && (!consents.terms || !consents.aiDisclaimer))
                    ? 'rgba(156,65,65,0.20)'
                    : 'rgba(156,65,65,0.16)',
                  border: `0.5px solid ${loading || (step === 2 && (!consents.terms || !consents.aiDisclaimer)) ? 'rgba(156,65,65,0.18)' : 'rgba(156,65,65,0.42)'}`,
                  color: loading || (step === 2 && (!consents.terms || !consents.aiDisclaimer)) ? 'rgba(156,65,65,0.45)' : '#9C4141',
                  cursor: loading || (step === 2 && (!consents.terms || !consents.aiDisclaimer)) ? 'not-allowed' : 'pointer',
                  fontWeight: 500
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {t('auth.register.creatingAccount')}
                  </span>
                ) : step < 2 ? (
                  <>{t('auth.register.continue')} <ArrowRight className="w-4 h-4" /></>
                ) : (
                  <>{t('auth.register.submit')} <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              {step > 0 && (
                <button
                  type="button"
                  onClick={() => { setStep(s => s - 1); setError(''); }}
                  className="w-full py-2 font-dm-sans text-sm transition-colors"
                  style={{ color: 'rgba(244,242,238,0.35)', background: 'transparent', border: 'none' }}
                >
                  ← Retour
                </button>
              )}
            </form>

            <p className="font-dm-sans text-xs text-center mt-6" style={{ color: 'rgba(244,242,238,0.30)' }}>
              <Link to="/waitlist" style={{ color: '#9C4141' }}>{t('auth.register.waitlist')}</Link>
            </p>

            <p className="font-dm-sans text-xs text-center mt-3" style={{ color: 'rgba(244,242,238,0.22)' }}>
              <Link to="/mentions-legales" style={{ color: 'rgba(244,242,238,0.22)' }}>Mentions légales</Link>
              {' · '}
              <Link to="/cookies" style={{ color: 'rgba(244,242,238,0.22)' }}>Cookies</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Wizard d'onboarding post-inscription */}
      {onboardingProfile?.role === 'franchiseur' && (
        <OnboardingFranchiseur profile={onboardingProfile} onComplete={handleOnboardingComplete} />
      )}
      {onboardingProfile?.role === 'avocat' && (
        <OnboardingAvocat profile={onboardingProfile} onComplete={handleOnboardingComplete} />
      )}
    </>
  );
}

function ConsentCheckbox({ id, checked, onChange, label }) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
      <div className="flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className="w-4 h-4 rounded flex items-center justify-center transition-all"
          style={{
            background: checked ? 'rgba(156,65,65,0.20)' : 'rgba(244,242,238,0.04)',
            border: checked ? '0.5px solid rgba(156,65,65,0.50)' : '0.5px solid rgba(244,242,238,0.14)',
          }}
        >
          {checked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="#9C4141" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <span className="font-dm-sans text-xs leading-relaxed" style={{ color: 'rgba(244,242,238,0.50)' }}>
        {label}
      </span>
    </label>
  );
}
