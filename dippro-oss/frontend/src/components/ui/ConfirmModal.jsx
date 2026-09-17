import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmer',
  variant = 'danger',
  isLoading = false
}) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md card border-border-default animate-slide-up shadow-2xl">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            variant === 'danger'
              ? 'bg-danger/10 border border-danger/20'
              : 'bg-gold/10 border border-gold/20'
          }`}>
            <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-danger' : 'text-gold'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-dm-sans text-base font-medium text-text-primary mb-1">{title}</h3>
            <p className="font-dm-sans text-sm text-text-secondary leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onCancel} className="btn-ghost text-sm py-2 px-4" disabled={isLoading}>
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 font-dm-sans font-medium px-5 py-2 rounded transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              variant === 'danger'
                ? 'bg-danger/90 hover:bg-danger text-white active:scale-95'
                : 'btn-primary py-2'
            }`}
          >
            {isLoading && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
