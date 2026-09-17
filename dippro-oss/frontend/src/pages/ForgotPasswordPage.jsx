import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Mail, CheckCircle, AlertCircle, Eye, EyeOff, MessageCircle } from 'lucide-react';
import usePageBackground from '../lib/usePageBackground';

const BG = `
  radial-gradient(ellipse 55% 50% at 15% 70%, rgba(156,65,65,0.20) 0%, transparent 60%),
  radial-gradient(ellipse 40% 60% at 80% 20%, rgba(130,50,50,0.14) 0%, transparent 55%),
  linear-gradient(160deg, #0a0805 0%, #0f0d08 25%, #080808 55%, #060606 100%)
`;

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '';

function buildWaLink(email, newPassword) {
  const msg = [
    'Bonjour Théo,',
    '',
    "Je n'arrive pas à réinitialiser mon mot de passe sur DIPpro.",
    '',
    `Mon email : ${email || '(à préciser)'}`,
    `Nouveau mot de passe souhaité : ${newPassword || '(à préciser)'}`,
    '',
    'Merci de m\'aider.',
  ].join('\n');
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function WhatsAppBlock({ email }) {
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  if (!WA_NUMBER) return null;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(156,65,65,0.12)' }} />
        <span className="font-dm-mono text-xs" style={{ color: 'rgba(244,242,238,0.25)' }}>ou</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(156,65,65,0.12)' }} />
      </div>

      <div className="rounded-xl px-4 py-4 space-y-3" style={{
        background: 'rgba(37,211,102,0.04)',
        border: '0.5px solid rgba(37,211,102,0.18)',
      }}>
        <p className="font-dm-sans text-xs" style={{ color: 'rgba(244,242,238,0.50)' }}>
          Email non reçu ? Contactez-nous directement sur WhatsApp — le message est déjà prérempli.
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
          href={buildWaLink(email, newPassword)}
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
    </div>
  );
}

export default function ForgotPasswordPage() {
  usePageBackground(BG);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Une erreur est survenue.');
      setSuccess(true);
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
            Mot de passe oublié
          </h1>
          <p className="font-dm-sans text-sm" style={{ color: 'rgba(244,242,238,0.44)' }}>
            Entrez votre email — nous vous envoyons un lien de réinitialisation.
          </p>
        </div>

        {success ? (
          <>
            <div className="rounded-xl px-5 py-6 text-center space-y-3" style={{
              background: 'rgba(52,211,153,0.06)',
              border: '0.5px solid rgba(52,211,153,0.25)',
            }}>
              <CheckCircle className="w-8 h-8 mx-auto" style={{ color: 'rgb(52,211,153)' }} />
              <p className="font-dm-sans text-sm" style={{ color: 'rgba(244,242,238,0.80)' }}>
                Email envoyé à <strong>{email}</strong>
              </p>
              <p className="font-dm-mono text-xs" style={{ color: 'rgba(244,242,238,0.38)' }}>
                Vérifiez vos spams si vous ne le recevez pas dans 2 minutes.
              </p>
            </div>
            <WhatsAppBlock email={email} />
          </>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 mb-5 font-dm-sans text-sm" style={{
                background: 'rgba(248,113,113,0.08)',
                border: '0.5px solid rgba(248,113,113,0.25)',
                color: '#F87171',
              }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="lg-label">Adresse email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  autoComplete="email"
                  className="lg-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-dm-sans text-sm transition-all mt-2"
                style={{
                  background: loading || !email ? 'rgba(156,65,65,0.25)' : 'rgba(156,65,65,0.16)',
                  border: `0.5px solid ${loading || !email ? 'rgba(156,65,65,0.20)' : 'rgba(156,65,65,0.42)'}`,
                  color: loading || !email ? 'rgba(156,65,65,0.50)' : '#9C4141',
                  cursor: loading || !email ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Envoi…
                  </span>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Envoyer le lien
                  </>
                )}
              </button>
            </form>

            <WhatsAppBlock email={email} />
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
