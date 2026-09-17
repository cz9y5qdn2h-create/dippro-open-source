import { useState } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.post('/feedback', { content: text.trim() });
      setSent(true);
      setText('');
      setTimeout(() => { setSent(false); setOpen(false); }, 2200);
    } catch {
      toast.error('Erreur lors de l\'envoi, réessayez.');
    }
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
  };

  return (
    <>
      {/* Toggle pill */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Suggérer une amélioration"
        style={{
          position: 'fixed',
          bottom: 96,
          right: 20,
          zIndex: 390,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 13px', borderRadius: 99,
          background: 'rgb(var(--bg-elevated))',
          border: '0.5px solid rgba(156,65,65,0.18)',
          color: 'rgba(156,65,65,0.50)',
          fontFamily: 'DM Sans, sans-serif', fontSize: 11.5,
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        className="hover:border-gold/40 hover:text-gold"
      >
        <MessageSquarePlus size={12} />
        <span>Idée</span>
      </button>

      {/* Panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 lg:hidden"
            style={{ zIndex: 391, background: 'transparent' }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'fixed',
              bottom: 136,
              right: 20,
              zIndex: 392,
              width: 300,
              background: 'rgb(var(--bg-card))',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              border: '0.5px solid rgba(156,65,65,0.25)',
              borderRadius: 16,
              padding: '18px 18px 14px',
              boxShadow: '0 16px 60px rgba(0,0,0,0.45)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <MessageSquarePlus size={13} style={{ color: 'rgb(156,65,65)' }} />
                <span style={{ fontFamily: 'Fraunces, serif', fontSize: 15, color: 'rgb(var(--text-primary))' }}>
                  Suggérer une amélioration
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'rgb(var(--text-muted))' }}
                className="hover:text-text-primary transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            {sent ? (
              <div style={{ textAlign: 'center', padding: '18px 0 8px' }}>
                <CheckCircle size={22} style={{ color: 'rgb(52,211,153)', margin: '0 auto 8px' }} />
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: 'rgb(var(--text-secondary))' }}>
                  Suggestion reçue — merci !
                </p>
              </div>
            ) : (
              <>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Quelle fonctionnalité vous manque ? Qu'est-ce qui pourrait être simplifié ?"
                  rows={4}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    resize: 'vertical',
                    background: 'rgb(var(--input-bg))',
                    border: '0.5px solid rgb(var(--border-default))',
                    borderRadius: 10, padding: '9px 11px',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 12.5,
                    color: 'rgb(var(--text-primary))', lineHeight: 1.6,
                    outline: 'none', marginBottom: 10,
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(156,65,65,0.40)')}
                  onBlur={e => (e.target.style.borderColor = 'rgb(var(--border-default))')}
                />
                <button
                  onClick={submit}
                  disabled={!text.trim() || sending}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    width: '100%', padding: '8px 14px', borderRadius: 9,
                    background: text.trim() ? 'rgba(156,65,65,0.12)' : 'rgba(156,65,65,0.04)',
                    border: '0.5px solid rgba(156,65,65,0.25)',
                    color: text.trim() ? 'rgb(156,65,65)' : 'rgba(156,65,65,0.30)',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 12.5,
                    cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                  }}
                >
                  <Send size={11} />
                  {sending ? 'Envoi…' : 'Envoyer'}
                </button>
                <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(156,65,65,0.28)', textAlign: 'center', marginTop: 9 }}>
                  Toutes les suggestions sont lues par Théo · Iralink
                </p>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
