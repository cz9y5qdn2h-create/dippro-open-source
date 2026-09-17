import { useEffect, useState } from 'react';
import { X, Calendar, Mail, Phone } from 'lucide-react';

const CAL_URL    = import.meta.env.VITE_CAL_COM_URL  || '';
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'contact@example.com';
const CONTACT_PHONE = import.meta.env.VITE_CONTACT_PHONE || '';

export default function CalModal({ open, onClose }) {
  const [view, setView] = useState('menu'); // 'menu' | 'cal'

  // Reset to menu when re-opened
  useEffect(() => { if (open) setView('menu'); }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto flex flex-col"
        style={{ background: 'rgb(var(--bg-card))', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', border: '1px solid rgb(var(--border-subtle))' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            {view === 'cal' && (
              <button
                onClick={() => setView('menu')}
                className="text-text-secondary hover:text-gold transition-colors text-sm font-dm-sans"
              >
                ← Retour
              </button>
            )}
            <div>
              <h2 className="font-cormorant text-xl text-text-primary">Contacter Iralink</h2>
              <p className="font-dm-sans text-xs text-text-secondary mt-0.5">
                Choisissez votre mode de contact
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded hover:bg-bg-elevated"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {view === 'menu' ? (
          /* Contact options menu */
          <div className="p-6 space-y-3">
            {/* Cal.com booking (optional, shown only if env var set) */}
            {CAL_URL && (
              <button
                onClick={() => setView('cal')}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border-default bg-bg-elevated hover:border-gold/40 hover:bg-gold/5 transition-all duration-200 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="font-dm-sans text-sm font-medium text-text-primary">Voir / revoir la présentation DIPpro</p>
                  <p className="font-dm-sans text-xs text-text-secondary mt-0.5">
                    Démo complète en 30 min — réservez un créneau
                  </p>
                </div>
              </button>
            )}

            {/* Email */}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=DIPpro — Question`}
              onClick={onClose}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border-default bg-bg-elevated hover:border-gold/40 hover:bg-gold/5 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="font-dm-sans text-sm font-medium text-text-primary">Envoyer un email</p>
                <p className="font-dm-mono text-xs text-text-secondary mt-0.5">{CONTACT_EMAIL}</p>
              </div>
            </a>

            {/* Phone (optional, shown only if env var set) */}
            {CONTACT_PHONE && (
              <a
                href={`tel:${CONTACT_PHONE}`}
                onClick={onClose}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border-default bg-bg-elevated hover:border-gold/40 hover:bg-gold/5 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="font-dm-sans text-sm font-medium text-text-primary">Appeler directement</p>
                  <p className="font-dm-mono text-xs text-text-secondary mt-0.5">{CONTACT_PHONE}</p>
                </div>
              </a>
            )}

            <p className="text-center font-dm-mono text-xs text-text-muted pt-2">
              Disponible du lundi au vendredi · 9h–18h
            </p>
          </div>
        ) : (
          /* Cal.com iframe */
          <div style={{ height: 'min(600px, 70vh)' }}>
            <iframe
              src={CAL_URL}
              width="100%"
              height="100%"
              frameBorder="0"
              title="Réserver un appel Iralink"
              style={{ border: 'none', background: '#080808' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
