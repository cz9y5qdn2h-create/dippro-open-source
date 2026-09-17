import { useState } from 'react';
import { X, Bug, Send, CheckCircle } from 'lucide-react';
import api from '../lib/api';

const SEVERITIES = [
  { value: 'bloquant',    label: 'Bloquant',    desc: 'Je ne peux plus utiliser l\'app', color: '#e53e3e' },
  { value: 'normal',      label: 'Problème',    desc: 'Une fonctionnalité ne marche pas', color: '#9c4141' },
  { value: 'cosmétique',  label: 'Cosmétique',  desc: 'Affichage ou texte incorrect', color: '#34d399' },
];

export default function BugReportModal({ open, onClose, errorInfo = null }) {
  const [description, setDescription] = useState(
    errorInfo?.message ? `Erreur rencontrée : ${errorInfo.message}` : ''
  );
  const [severity, setSeverity] = useState(errorInfo ? 'bloquant' : 'normal');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!description.trim() || sending) return;
    setSending(true);
    try {
      await api.post('/bugs', {
        description: description.trim(),
        severity,
        page_url: window.location.href,
        error_stack: errorInfo?.stack || null,
      });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setDescription('');
        setSeverity('normal');
        onClose();
      }, 2800);
    } catch {
      onClose();
    }
    setSending(false);
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 800,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
      />
      <div style={{
        position: 'fixed', zIndex: 801,
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'calc(100% - 32px)', maxWidth: 480,
        background: 'rgb(var(--bg-card))',
        backdropFilter: 'blur(32px) saturate(160%)',
        WebkitBackdropFilter: 'blur(32px) saturate(160%)',
        border: '0.5px solid rgba(229,62,62,0.20)',
        borderRadius: 18,
        padding: 28,
        boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(229,62,62,0.10)', border: '0.5px solid rgba(229,62,62,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bug size={16} color="#e53e3e" />
            </div>
            <div>
              <p style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: 'rgb(var(--text-primary))', margin: 0, lineHeight: 1.2 }}>
                Signaler un problème
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11.5, color: 'rgb(var(--text-muted))', margin: '3px 0 0' }}>
                L'équipe Iralink sera notifiée immédiatement
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgb(var(--text-muted))', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '28px 0 16px' }}>
            <CheckCircle size={30} color="#34d399" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: 'rgb(var(--text-primary))', marginBottom: 8 }}>
              Rapport envoyé — merci !
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgb(var(--text-secondary))' }}>
              Théo va traiter votre signalement dès que possible.
            </p>
          </div>
        ) : (
          <>
            {/* Gravité */}
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10.5, color: 'rgb(var(--text-muted))', marginBottom: 9, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Gravité
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {SEVERITIES.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSeverity(opt.value)}
                    title={opt.desc}
                    style={{
                      flex: 1, padding: '8px 6px', borderRadius: 9,
                      background: severity === opt.value ? `${opt.color}18` : 'transparent',
                      border: `0.5px solid ${severity === opt.value ? opt.color + '55' : 'rgb(var(--border-default))'}`,
                      color: severity === opt.value ? opt.color : 'rgb(var(--text-secondary))',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 12.5,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10.5, color: 'rgb(var(--text-muted))', marginBottom: 9, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Description du problème
              </p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Décrivez ce qui s'est passé, les étapes pour reproduire le problème…"
                rows={5}
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'vertical',
                  background: 'rgb(var(--input-bg))',
                  border: '0.5px solid rgb(var(--border-default))',
                  borderRadius: 10, padding: '10px 12px',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                  color: 'rgb(var(--text-primary))', lineHeight: 1.6,
                  outline: 'none', transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(229,62,62,0.40)')}
                onBlur={e => (e.target.style.borderColor = 'rgb(var(--border-default))')}
              />
            </div>

            {/* Contexte auto-capturé */}
            <div style={{
              background: 'rgb(var(--bg-elevated))', borderRadius: 8, padding: '7px 11px',
              fontFamily: 'DM Mono, monospace', fontSize: 10.5, color: 'rgb(var(--text-muted))',
              marginBottom: 18, wordBreak: 'break-all', lineHeight: 1.5,
            }}>
              Page : {window.location.pathname}
              {errorInfo && <><br />Erreur : {String(errorInfo.message || '').slice(0, 100)}</>}
            </div>

            {/* Submit */}
            <button
              onClick={submit}
              disabled={!description.trim() || sending}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                width: '100%', padding: '10px 16px', borderRadius: 10,
                background: description.trim() ? 'rgba(229,62,62,0.12)' : 'rgba(229,62,62,0.04)',
                border: `0.5px solid ${description.trim() ? 'rgba(229,62,62,0.35)' : 'rgba(229,62,62,0.12)'}`,
                color: description.trim() ? '#e53e3e' : 'rgba(229,62,62,0.35)',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13.5,
                cursor: description.trim() && !sending ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              <Send size={13} />
              {sending ? 'Envoi en cours…' : 'Envoyer à DIPpro'}
            </button>
          </>
        )}
      </div>
    </>
  );
}
