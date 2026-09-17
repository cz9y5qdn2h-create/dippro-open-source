import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X, Upload, CheckCircle, AlertTriangle, Link as LinkIcon, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'dippro-onboarding-seen';

export default function OnboardingModal({ forceShow = false, onClose }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (forceShow || !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, [forceShow]);

  if (!visible) return null;

  const slides = [
    {
      visual: <SlideWelcome />,
      title: t('onboarding.slide1.title'),
      desc: t('onboarding.slide1.desc'),
    },
    {
      visual: <SlideUpload />,
      title: t('onboarding.slide2.title'),
      desc: t('onboarding.slide2.desc'),
    },
    {
      visual: <SlideScore />,
      title: t('onboarding.slide3.title'),
      desc: t('onboarding.slide3.desc'),
    },
    {
      visual: <SlideCorrections />,
      title: t('onboarding.slide4.title'),
      desc: t('onboarding.slide4.desc'),
    },
    {
      visual: <SlideShare />,
      title: t('onboarding.slide5.title'),
      desc: t('onboarding.slide5.desc'),
    },
    {
      visual: <SlideReady />,
      title: t('onboarding.slide6.title'),
      desc: t('onboarding.slide6.desc'),
    },
  ];

  const totalSlides = slides.length;

  const handleClose = () => {
    const isFirstTime = !localStorage.getItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    onClose?.();
    if (isFirstTime && !forceShow) {
      window.dispatchEvent(new CustomEvent('dippro-modal-done'));
    }
  };

  const goTo = (index) => {
    if (index < 0 || index >= totalSlides) return;
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  };

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.60)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          borderRadius: '24px',
          border: '1px solid rgba(156,65,65,0.30)',
          background: 'rgba(255,255,255,0.96)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
          '--text-primary': '26 24 38',
          '--text-secondary': '71 85 105',
          '--text-muted': '148 163 184',
        }}
      >
        {/* Header — bouton passer */}
        <div style={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 10,
        }}>
          <button
            onClick={handleClose}
            style={{
              fontSize: '12px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#475569',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <X style={{ width: 12, height: 12 }} />
            {t('onboarding.skip')}
          </button>
        </div>

        {/* Zone visuelle */}
        <div style={{
          height: '280px',
          background: 'rgba(156,65,65,0.04)',
          borderBottom: '1px solid rgba(156,65,65,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.30, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {slides[current].visual}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Zone texte */}
        <div style={{ padding: '28px 32px 20px' }}>
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={`text-${current}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <h2 className="font-cormorant" style={{
                fontSize: '24px',
                fontWeight: 600,
                color: 'rgb(var(--text-primary))',
                marginBottom: '10px',
                lineHeight: 1.3,
              }}>
                {slides[current].title}
              </h2>
              <p className="font-dm-sans" style={{
                fontSize: '14px',
                color: 'rgb(var(--text-secondary))',
                lineHeight: 1.6,
              }}>
                {slides[current].desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px 24px',
        }}>
          {/* Flèche gauche */}
          <button
            onClick={() => goTo(current - 1)}
            disabled={current === 0}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '1px solid rgba(156,65,65,0.25)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: current === 0 ? 'not-allowed' : 'pointer',
              opacity: current === 0 ? 0.3 : 1,
              transition: 'opacity 0.2s',
              color: 'rgb(var(--text-primary))',
            }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>

          {/* Dots */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  width: i === current ? 20 : 7,
                  height: 7,
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  background: i === current
                    ? 'rgb(var(--gold))'
                    : 'rgba(156,65,65,0.25)',
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* Flèche droite ou bouton CTA */}
          {current < totalSlides - 1 ? (
            <button
              onClick={() => goTo(current + 1)}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid rgba(156,65,65,0.35)',
                background: 'rgba(156,65,65,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
                color: 'rgb(var(--gold))',
              }}
            >
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          ) : (
            <button
              onClick={handleClose}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #9C4141 0%, #A8893E 100%)',
                color: '#1A1826',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                boxShadow: '0 4px 14px -4px rgba(168,137,62,0.55)',
                fontFamily: 'DM Sans, sans-serif',
                letterSpacing: '0.01em',
              }}
            >
              {t('onboarding.cta')} →
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Slide 1 — Bienvenue ─── */
function SlideWelcome() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Cercle de progression SVG */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(156,65,65,0.12)" strokeWidth="8" />
          <motion.circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke="rgb(var(--gold, 200 169 110))"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - 0.87) }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span className="font-cormorant" style={{ fontSize: 28, fontWeight: 700, color: 'rgb(var(--gold, 200 169 110))' }}>87%</span>
          <span className="font-dm-sans" style={{ fontSize: 10, color: 'rgb(var(--text-secondary))', marginTop: -2 }}>conformité</span>
        </div>
      </div>
      {/* Logo badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 20px',
        borderRadius: 12,
        border: '1px solid rgba(156,65,65,0.25)',
        background: 'rgba(156,65,65,0.07)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(156,65,65,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles style={{ width: 14, height: 14, color: 'rgb(var(--gold, 200 169 110))' }} />
        </div>
        <span className="font-cormorant" style={{ fontSize: 18, color: 'rgb(var(--text-primary))', fontWeight: 600 }}>DIPpro</span>
        <span className="font-dm-mono" style={{ fontSize: 10, color: 'rgb(var(--text-secondary))' }}>by Iralink</span>
      </div>
    </div>
  );
}

/* ─── Slide 2 — Import DIP ─── */
function SlideUpload() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 340 }}>
      <div style={{
        width: '100%',
        border: '2px dashed rgba(156,65,65,0.40)',
        borderRadius: 16,
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(156,65,65,0.03)',
        position: 'relative',
      }}>
        {/* Badge IA */}
        <div style={{
          position: 'absolute',
          top: 10, right: 10,
          padding: '3px 8px',
          borderRadius: 6,
          background: 'rgba(156,65,65,0.20)',
          border: '1px solid rgba(156,65,65,0.40)',
        }}>
          <span className="font-dm-mono" style={{ fontSize: 10, color: 'rgb(var(--gold, 200 169 110))', fontWeight: 700 }}>IA</span>
        </div>

        <div style={{
          width: 52, height: 52,
          borderRadius: 14,
          background: 'rgba(156,65,65,0.12)',
          border: '1px solid rgba(156,65,65,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Upload style={{ width: 22, height: 22, color: 'rgb(var(--gold, 200 169 110))' }} />
        </div>
        <span className="font-dm-sans" style={{ fontSize: 13, color: 'rgb(var(--text-primary))', fontWeight: 500 }}>
          Glissez votre fichier ici
        </span>
        <span className="font-dm-mono" style={{ fontSize: 11, color: 'rgb(var(--text-secondary))' }}>
          PDF / DOCX acceptés
        </span>
        <div style={{
          padding: '6px 18px',
          borderRadius: 8,
          background: 'rgba(156,65,65,0.14)',
          border: '1px solid rgba(156,65,65,0.30)',
        }}>
          <span className="font-dm-sans" style={{ fontSize: 12, color: 'rgb(var(--gold, 200 169 110))', fontWeight: 600 }}>
            Parcourir…
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 3 — Score de conformité ─── */
function SlideScore() {
  const items = [
    { label: 'Conforme', symbol: '✓', color: 'rgb(var(--success, 52 211 153))', bg: 'rgba(52,211,153,0.08)', count: 7 },
    { label: 'À vérifier', symbol: '⚠', color: 'rgb(var(--gold, 200 169 110))', bg: 'rgba(156,65,65,0.08)', count: 2 },
    { label: 'Non conforme', symbol: '✗', color: 'rgb(var(--danger, 248 113 113))', bg: 'rgba(248,113,113,0.08)', count: 1 },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '0 24px' }}>
      {/* Grand chiffre */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <span className="font-cormorant" style={{ fontSize: 64, fontWeight: 700, color: 'rgb(var(--gold, 200 169 110))', lineHeight: 1 }}>
          87
        </span>
        <span className="font-cormorant" style={{ fontSize: 28, color: 'rgb(var(--gold, 200 169 110))', lineHeight: 1 }}>%</span>
        <span className="font-dm-mono" style={{ fontSize: 10, color: 'rgb(var(--text-secondary))', marginTop: 4 }}>
          Score global
        </span>
      </div>

      {/* Lignes statut */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(({ label, symbol, color, bg, count }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px',
            borderRadius: 10,
            background: bg,
            border: `1px solid ${color}22`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color, fontSize: 14, fontWeight: 700 }}>{symbol}</span>
              <span className="font-dm-sans" style={{ fontSize: 13, color: 'rgb(var(--text-primary))' }}>{label}</span>
            </div>
            <span className="font-dm-mono" style={{ fontSize: 13, fontWeight: 700, color }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Slide 4 — Corrections IA ─── */
function SlideCorrections() {
  const alerts = [
    {
      label: 'Section 3 · Réseau',
      severity: 'Critique',
      color: 'rgb(var(--danger, 248 113 113))',
      bg: 'rgba(248,113,113,0.07)',
      border: 'rgba(248,113,113,0.20)',
      showBtn: true,
    },
    {
      label: 'Section 7 · Finances',
      severity: 'Modéré',
      color: 'rgb(var(--gold, 200 169 110))',
      bg: 'rgba(156,65,65,0.07)',
      border: 'rgba(156,65,65,0.20)',
      showBtn: false,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 24px', width: '100%', maxWidth: 360 }}>
      {alerts.map(({ label, severity, color, bg, border, showBtn }) => (
        <div key={label} style={{
          padding: '14px 16px',
          borderRadius: 12,
          background: bg,
          border: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <AlertTriangle style={{ width: 16, height: 16, color, flexShrink: 0 }} />
            <div>
              <p className="font-dm-sans" style={{ fontSize: 13, fontWeight: 600, color: 'rgb(var(--text-primary))' }}>{label}</p>
              <p className="font-dm-mono" style={{ fontSize: 10, color }}>{severity}</p>
            </div>
          </div>
          {showBtn && (
            <button style={{
              padding: '5px 12px',
              borderRadius: 7,
              background: 'rgba(156,65,65,0.16)',
              border: '1px solid rgba(156,65,65,0.35)',
              color: 'rgb(var(--gold, 200 169 110))',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer',
              flexShrink: 0,
            }}>
              Appliquer
            </button>
          )}
        </div>
      ))}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        borderRadius: 8,
        background: 'rgba(156,65,65,0.05)',
        border: '1px dashed rgba(156,65,65,0.18)',
      }}>
        <Sparkles style={{ width: 13, height: 13, color: 'rgb(var(--gold, 200 169 110))' }} />
        <span className="font-dm-sans" style={{ fontSize: 12, color: 'rgb(var(--text-secondary))' }}>
          Claude génère les corrections en 30–90 s
        </span>
      </div>
    </div>
  );
}

/* ─── Slide 5 — Partage ─── */
function SlideShare() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 24px', width: '100%', maxWidth: 360 }}>
      <div style={{
        padding: '16px',
        borderRadius: 14,
        border: '1px solid rgba(156,65,65,0.22)',
        background: 'rgba(156,65,65,0.04)',
      }}>
        {/* Ligne URL */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          borderRadius: 8,
          background: 'rgba(0,0,0,0.04)',
          border: '1px solid rgba(156,65,65,0.15)',
          marginBottom: 12,
        }}>
          <LinkIcon style={{ width: 13, height: 13, color: 'rgb(var(--gold, 200 169 110))', flexShrink: 0 }} />
          <span className="font-dm-mono" style={{ fontSize: 11, color: 'rgb(var(--text-secondary))', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            dippro.fr/share/abc123…
          </span>
          <button style={{
            padding: '3px 10px',
            borderRadius: 6,
            background: 'rgba(156,65,65,0.16)',
            border: '1px solid rgba(156,65,65,0.30)',
            color: 'rgb(var(--gold, 200 169 110))',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer',
          }}>
            Copier
          </button>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Loi Doubin 1989', 'Sous-traitants encadrés RGPD', 'Horodaté'].map((badge) => (
            <span key={badge} style={{
              padding: '3px 9px',
              borderRadius: 20,
              background: 'rgba(156,65,65,0.10)',
              border: '1px solid rgba(156,65,65,0.22)',
              fontSize: 10,
              fontFamily: 'DM Mono, monospace',
              color: 'rgb(var(--gold, 200 169 110))',
            }}>
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* Info suivi */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        borderRadius: 8,
        background: 'rgba(52,211,153,0.06)',
        border: '1px solid rgba(52,211,153,0.15)',
      }}>
        <CheckCircle style={{ width: 13, height: 13, color: 'rgb(var(--success, 52 211 153))', flexShrink: 0 }} />
        <span className="font-dm-sans" style={{ fontSize: 12, color: 'rgb(var(--text-secondary))' }}>
          Suivi de lecture des candidats en temps réel
        </span>
      </div>
    </div>
  );
}

/* ─── Slide 6 — Prêt ─── */
function SlideReady() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {/* Checkmark animé */}
      <div style={{ position: 'relative' }}>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          style={{
            width: 80, height: 80,
            borderRadius: '50%',
            background: 'rgba(156,65,65,0.12)',
            border: '2px solid rgba(156,65,65,0.40)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <CheckCircle style={{ width: 36, height: 36, color: 'rgb(var(--gold, 200 169 110))' }} />
          </motion.div>
        </motion.div>
        {/* Halo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.3, opacity: 0 }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.5 }}
          style={{
            position: 'absolute',
            inset: -8,
            borderRadius: '50%',
            border: '1px solid rgba(156,65,65,0.30)',
          }}
        />
      </div>

      {/* Flow 3 étapes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {[
          { Icon: Upload, label: 'Import' },
          { Icon: Sparkles, label: 'Analyse' },
          { Icon: CheckCircle, label: 'Partage' },
        ].map(({ Icon, label }, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.15 }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}
            >
              <div style={{
                width: 36, height: 36,
                borderRadius: 10,
                background: 'rgba(156,65,65,0.10)',
                border: '1px solid rgba(156,65,65,0.28)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon style={{ width: 16, height: 16, color: 'rgb(var(--gold, 200 169 110))' }} />
              </div>
              <span className="font-dm-sans" style={{ fontSize: 11, color: 'rgb(var(--text-secondary))' }}>{label}</span>
            </motion.div>
            {i < 2 && (
              <div style={{
                width: 20, height: 1,
                background: 'rgba(156,65,65,0.30)',
                marginBottom: 18,
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
