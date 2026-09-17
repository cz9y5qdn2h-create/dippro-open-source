import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Eye, EyeOff, CheckCircle, AlertCircle, Lock, ArrowLeft, MessageCircle } from 'lucide-react';
import usePageBackground from '../lib/usePageBackground';

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '';

function buildWaLink(newPassword) {
  const msg = [
    'Bonjour Théo,',
    '',
    "Mon lien de réinitialisation de mot de passe sur DIPpro est invalide ou expiré.",
    '',
    `Nouveau mot de passe souhaité : ${newPassword || '(à préciser)'}`,
    '',
    'Merci de m\'aider.',
  ].join('\n');
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function WhatsAppBlock() {
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  if (!WA_NUMBER) return null;

  return (
    <div className="mt-5 rounded-xl px-4 py-4 space-y-3" style={{
      background: 'rgba(37,211,102,0.04)',
      border: '0.5px solid rgba(37,211,102,0.18)',
    }}>
      <p className="font-dm-sans text-xs" style={{ color: 'rgba(244,242,238,0.50)' }}>
        Contactez-nous sur WhatsApp — le message est prérempli.
      </p>
      <div>
        <label className="lg-label" style={{ color: 'rgba(244,242,238,0.40)', fontSize: 11 }}>
          Votre nouveau mot de passe souhaité
        </label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Nouveau mot de passe…"
            className="lg-input"
            style={{ paddingRight: '44px', fontSize: 13 }}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgba(244,242,238,0.30)' }}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <a
        href={buildWaLink(newPassword)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-3 rounded-xl font-dm-sans text-sm font-medium transition-all"
        style={{
          background: 'rgba(37,211,102,0.12)',
          border: '0.5px solid rgba(37,211,102,0.35)',
          color: 'rgb(37,211,102)',
        }}
      >
        <MessageCircle className="w-4 h-4" />
        Nous contacter sur WhatsApp
      </a>
    </div>
  );
}

const BG = `
  radial-gradient(ellipse 55% 50% at 15% 70%, rgba(156,65,65,0.20) 0%, transparent 60%),
  radial-gradient(ellipse 40% 60% at 80% 20%, rgba(130,50,50,0.14) 0%, transparent 55%),
  linear-gradient(160deg, #0a0805 0%, #0f0d08 25%, #080808 55%, #060606 100%)
`;

export default function ResetPasswordPage() {
  usePageBackground(BG);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Lien invalide. Faites une nouvelle demande.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Une erreur est survenue.');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG }}>
      <div className="w-full max-w-sm">

        <div className="flex items-center gap-3 mb-10">
          <div className="lg-avatar">
            <Shield className="w-4 h-4" style={{ color: '#9C4141' }} />
          </div>
          <p className="font-cormorant text-xl" style={{ color: '#F4F2EE' }}>DIPpro</p>
        </div>

        <div className="mb-8">
          <h1 className="font-cormorant text-3xl mb-1" style={{ color: '#F4F2EE', fontWeight: 300 }}>
            Nouveau mot de passe
          </h1>
          <p className="font-dm-sans text-sm" style={{ color: 'rgba(244,242,238,0.44)' }}>
            Choisissez un mot de passe sécurisé d'au moins 8 caractères.
          </p>
        </div>

        {success ? (
          <div className="rounded-xl px-5 py-6 text-center space-y-3" style={{
            background: 'rgba(52,211,153,0.06)',
            border: '0.5px solid rgba(52,211,153,0.25)',
          }}>
            <CheckCircle className="w-8 h-8 mx-auto" style={{ color: 'rgb(52,211,153)' }} />
            <p className="font-dm-sans text-sm" style={{ color: 'rgba(244,242,238,0.80)' }}>
              Mot de passe mis à jour — redirection…
            </p>
          </div>
        ) : !token ? (
          <div className="space-y-5">
            <div className="rounded-xl px-5 py-5 text-center space-y-2" style={{
              background: 'rgba(248,113,113,0.06)',
              border: '0.5px solid rgba(248,113,113,0.20)',
            }}>
              <AlertCircle className="w-7 h-7 mx-auto" style={{ color: '#F87171' }} />
              <p className="font-dm-sans text-sm" style={{ color: '#F87171' }}>
                Lien invalide. Faites une nouvelle demande.
              </p>
            </div>
            <Link
              to="/forgot-password"
              className="flex items-center justify-center gap-1.5 font-dm-sans text-sm py-3 rounded-xl transition-all"
              style={{
                background: 'rgba(156,65,65,0.10)',
                border: '0.5px solid rgba(156,65,65,0.30)',
                color: '#9C4141',
              }}
            >
              Faire une nouvelle demande
            </Link>
            <WhatsAppBlock />
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-xl px-4 py-3 mb-5 space-y-3" style={{
                background: 'rgba(248,113,113,0.08)',
                border: '0.5px solid rgba(248,113,113,0.25)',
              }}>
                <div className="flex items-center gap-2.5 font-dm-sans text-sm" style={{ color: '#F87171' }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
                {(error.includes('expiré') || error.includes('invalide') || error.includes('utilisé')) && (
                  <>
                    <Link
                      to="/forgot-password"
                      className="block text-center font-dm-sans text-xs py-2 rounded-lg transition-all"
                      style={{
                        background: 'rgba(156,65,65,0.08)',
                        border: '0.5px solid rgba(156,65,65,0.25)',
                        color: '#9C4141',
                      }}
                    >
                      Faire une nouvelle demande →
                    </Link>
                    <WhatsAppBlock />
                  </>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="lg-label">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="lg-input"
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(244,242,238,0.35)' }}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="lg-label">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="lg-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-dm-sans text-sm transition-all mt-2"
                style={{
                  background: loading || !password || !confirm ? 'rgba(156,65,65,0.25)' : 'rgba(156,65,65,0.16)',
                  border: `0.5px solid ${loading || !password || !confirm ? 'rgba(156,65,65,0.20)' : 'rgba(156,65,65,0.42)'}`,
                  color: loading || !password || !confirm ? 'rgba(156,65,65,0.50)' : '#9C4141',
                  cursor: loading || !password || !confirm ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Mise à jour…
                  </span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Définir le nouveau mot de passe
                  </>
                )}
              </button>
            </form>
          </>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 font-dm-sans text-sm transition-colors"
            style={{ color: 'rgba(156,65,65,0.55)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
