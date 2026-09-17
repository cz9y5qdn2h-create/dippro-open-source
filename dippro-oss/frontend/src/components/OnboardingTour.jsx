import { useState, useEffect, useCallback } from 'react';
import {
  Shield, FileText, ScrollText, Bell, Users, History,
  Phone, X, ChevronRight,
} from 'lucide-react';
import CalModal from './CalModal';

const TOUR_KEY = 'dippro-tour-v1';

const STEPS = [
  {
    id: 'welcome',
    selector: null,
    icon: Shield,
    title: 'Bienvenue sur DIPpro',
    body: 'DIPpro automatise la gestion légale de votre Document d\'Information Précontractuelle, obligatoire au titre de la Loi Doubin. Un DIP incomplet expose votre réseau à un risque de nullité du contrat si le manquement a vicié le consentement du franchisé.',
    note: '6 étapes pour comprendre l\'essentiel — 2 minutes.',
  },
  {
    id: 'dip',
    selector: '[data-tour="nav-dip"]',
    icon: FileText,
    title: '① Mon DIP',
    body: 'Importez votre DIP existant (PDF/DOCX) ou générez-en un en 8 étapes guidées par l\'IA. Le score de conformité sur les 10 sections légales obligatoires se met à jour en continu.',
    note: 'Ex. : importez le DIP signé l\'an dernier — l\'IA repère immédiatement les sections obsolètes.',
  },
  {
    id: 'contrat',
    selector: '[data-tour="nav-contrat"]',
    icon: ScrollText,
    title: '② Mon contrat',
    body: 'L\'IA rédige les 10 clauses de votre contrat de franchise directement depuis votre DIP, garantissant la cohérence entre les deux documents.',
    note: 'Mode assisté pour ajouter des précisions propres à votre réseau (export, partenariats…).',
  },
  {
    id: 'alerts',
    selector: '[data-tour="nav-alerts"]',
    icon: Bell,
    title: '③ Alertes & veille',
    body: 'Surveillance automatique de Légifrance et de la Fédération Française de la Franchise. Une alerte remonte dès qu\'une évolution réglementaire impacte votre DIP.',
    note: '3 niveaux d\'automatisation : contrôle total, semi-auto (recommandé), ou full-auto après 48h.',
  },
  {
    id: 'franchisees',
    selector: '[data-tour="nav-franchisees"]',
    icon: Users,
    title: '④ Franchisés',
    body: 'Gérez votre base de franchisés, suivez les dates de leurs contrats et envoyez des notifications groupées à chaque mise à jour du DIP.',
    note: 'Import CSV de tout votre réseau en une seule opération.',
  },
  {
    id: 'history',
    selector: '[data-tour="nav-history"]',
    icon: History,
    title: '⑤ Historique d\'audit',
    body: 'Chaque modification est horodatée avec un comparatif avant/après. En cas de litige avec un franchisé, c\'est votre preuve de diligence juridique.',
    note: 'Exportez le rapport PDF pour le transmettre directement à votre cabinet d\'avocats.',
  },
  {
    id: 'call',
    selector: null,
    icon: Phone,
    title: 'Prochaine étape',
    body: 'Pour un état des lieux de votre situation spécifique — score de conformité actuel, niveau d\'automatisation adapté à votre réseau — réservez 20 minutes avec Théo chez Iralink Agency.',
    note: null,
    isCta: true,
  },
];

const CARD_W = 360;
const CARD_H = 260;

export default function OnboardingTour() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState({ centered: true });
  const [calOpen, setCalOpen] = useState(false);

  useEffect(() => {
    // Returning users: tour fires si modal déjà vue dans une session précédente
    if (!localStorage.getItem(TOUR_KEY) && localStorage.getItem('dippro-onboarding-seen')) {
      setTimeout(() => setShow(true), 800);
    }
    // Nouveaux utilisateurs: attend que la modal se ferme avant de démarrer
    const onModalDone = () => {
      if (!localStorage.getItem(TOUR_KEY)) setTimeout(() => setShow(true), 600);
    };
    window.addEventListener('dippro-modal-done', onModalDone);
    return () => window.removeEventListener('dippro-modal-done', onModalDone);
  }, []);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const computePos = useCallback(() => {
    if (!current.selector || window.innerWidth < 1024) {
      setPos({ centered: true });
      return;
    }
    const el = document.querySelector(current.selector);
    if (!el) { setPos({ centered: true }); return; }

    const r = el.getBoundingClientRect();
    const top = Math.max(16, Math.min(
      r.top + r.height / 2 - CARD_H / 2,
      window.innerHeight - CARD_H - 16,
    ));
    const arrowY = r.top + r.height / 2;
    setPos({ centered: false, top, left: r.right + 18, arrowY, targetMidY: arrowY });
  }, [step, current.selector]);

  useEffect(() => {
    if (!show) return;
    computePos();
    window.addEventListener('resize', computePos);

    let prevEl = null;
    if (current.selector) {
      prevEl = document.querySelector(current.selector);
      prevEl?.setAttribute('data-tour-active', 'true');
    }
    return () => {
      window.removeEventListener('resize', computePos);
      prevEl?.removeAttribute('data-tour-active');
    };
  }, [show, step, computePos]);

  const done = () => {
    localStorage.setItem(TOUR_KEY, '1');
    setShow(false);
  };

  const next = () => isLast ? done() : setStep(s => s + 1);
  const prev = () => step > 0 && setStep(s => s - 1);

  if (!show) return null;

  const Icon = current.icon;
  const { centered, top, left, arrowY } = pos;

  const cardStyle = centered
    ? { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: `min(${CARD_W + 60}px, calc(100vw - 32px))` }
    : { position: 'fixed', top, left, width: CARD_W };

  return (
    <>
      {centered && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          style={{ zIndex: 9990 }}
          onClick={done}
        />
      )}

      {!centered && arrowY != null && (
        <div style={{ position: 'fixed', top: arrowY - 7, left: left - 12, zIndex: 9998, pointerEvents: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M14 7L0 0L4 7L0 14Z" fill="rgba(156,65,65,0.45)" />
          </svg>
        </div>
      )}

      <div
        style={{
          ...cardStyle,
          zIndex: 9999,
          background: 'rgb(var(--bg-card))',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          border: '0.5px solid rgba(156,65,65,0.32)',
          borderRadius: 18,
          padding: '22px 26px 18px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
        }}
      >
        <button
          onClick={done}
          style={{ position: 'absolute', top: 12, right: 12, padding: 4, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))' }}
          className="hover:text-text-primary transition-colors"
        >
          <X size={13} />
        </button>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 4, borderRadius: 99,
                width: i === step ? 18 : 4,
                background: i === step ? 'rgb(156,65,65)' : 'rgba(156,65,65,0.18)',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(156,65,65,0.40)', marginLeft: 4 }}>
            {step + 1}/{STEPS.length}
          </span>
        </div>

        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: 'rgba(156,65,65,0.10)',
            border: '0.5px solid rgba(156,65,65,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={14} style={{ color: 'rgb(156,65,65)' }} />
          </div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 400, color: 'rgb(var(--text-primary))' }}>
            {current.title}
          </h3>
        </div>

        {/* Body */}
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgb(var(--text-secondary))', lineHeight: 1.7, marginBottom: current.note ? 10 : 18 }}>
          {current.body}
        </p>

        {/* Note */}
        {current.note && (
          <p style={{
            fontFamily: 'DM Mono, monospace', fontSize: 11,
            color: 'rgba(156,65,65,0.52)', lineHeight: 1.55,
            paddingLeft: 10, marginBottom: 18,
            borderLeft: '2px solid rgba(156,65,65,0.18)',
          }}>
            {current.note}
          </p>
        )}

        {/* CTA button */}
        {current.isCta && (
          <button
            onClick={() => setCalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '11px 20px', borderRadius: 10, marginBottom: 10,
              background: 'rgb(156,65,65)', color: '#080808',
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
              border: 'none', cursor: 'pointer',
            }}
          >
            <Phone size={13} />
            Réserver un appel avec Théo
          </button>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button
            onClick={step > 0 ? prev : done}
            style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgb(var(--text-muted))', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}
          >
            {step > 0 ? '← Précédent' : 'Passer le tour'}
          </button>

          <button
            onClick={next}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 16px', borderRadius: 9,
              background: 'rgba(156,65,65,0.10)',
              border: '0.5px solid rgba(156,65,65,0.28)',
              color: 'rgb(156,65,65)',
              fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, cursor: 'pointer',
            }}
          >
            {isLast ? 'Terminer' : 'Suivant'}
            {!isLast && <ChevronRight size={12} />}
          </button>
        </div>
      </div>

      <CalModal open={calOpen} onClose={() => { setCalOpen(false); done(); }} />

      <style>{`
        [data-tour-active="true"] {
          outline: 2px solid rgba(156,65,65,0.55) !important;
          outline-offset: 3px;
          border-radius: 8px;
        }
        @keyframes tour-pulse {
          0%, 100% { outline-color: rgba(156,65,65,0.55); }
          50% { outline-color: rgba(156,65,65,0.20); }
        }
        [data-tour-active="true"] {
          animation: tour-pulse 1.8s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
