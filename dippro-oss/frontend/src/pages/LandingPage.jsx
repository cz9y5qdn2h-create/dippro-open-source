import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, CheckCircle, Bell, Users, Download, Zap, ArrowRight,
  ChevronDown, Sparkles, AlertTriangle, FileText, Send, Lock,
  FileCheck, Clock, TrendingUp, Star, GitBranch, Menu, X, BookOpen,
  FolderOpen, ShieldCheck, Gauge, UserPlus,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import api from '../lib/api';
import usePageBackground from '../lib/usePageBackground';

const GOLD = '#9C4141';

const DARK_BG = {
  background: `
    radial-gradient(ellipse 55% 50% at 15% 70%, rgba(156,65,65,0.16) 0%, transparent 60%),
    radial-gradient(ellipse 40% 60% at 80% 20%, rgba(140,125,100,0.09) 0%, transparent 55%),
    radial-gradient(ellipse 60% 40% at 60% 85%, rgba(110,44,44,0.10) 0%, transparent 60%),
    linear-gradient(160deg, #0a0d10 0%, #0d1114 25%, #090b0d 55%, #060708 100%)`
};

const FEATURES = [
  { icon: Gauge,      title: 'Vue portefeuille',            desc: 'Le score de conformité de chaque client, et la moyenne de tout votre portefeuille, recalculés en direct — jamais une valeur stockée qui traîne.' },
  { icon: ShieldCheck, title: 'Vous gardez la main',         desc: 'Chaque édition d\'un client repasse par votre confirmation avant de compter comme conforme — blocage strict ou simple alerte, configurable par client.' },
  { icon: FolderOpen, title: 'Un dossier par client',        desc: 'DIP, sections, annexes et certificats de tous vos clients rangés dans une arborescence unique — plus besoin de fouiller les emails.' },
  { icon: Bell,       title: 'Compte-rendu automatique',     desc: 'Analyse programmée de tous vos clients, section par section, envoyée par email ou consultable dans votre historique — aucun appel IA supplémentaire, donc aucun coût caché.' },
  { icon: FileCheck,  title: 'Attestation certifiée',        desc: 'PDF horodaté, empreinte SHA-256, numérotation séquentielle sans trou — preuve de remise et de validation incontestable en cas de contentieux.' },
  { icon: Sparkles,   title: 'Base légale exacte',           desc: 'Chaque statut relié à la sous-disposition R.330-1 précise (jamais « R.330-1 » seul) et à la jurisprudence vérifiée — pas d\'approximation.' },
];

const HOW_STEPS = [
  {
    num: '01',
    icon: UserPlus,
    title: 'Invitez vos clients',
    desc: 'Un espace est créé pour chaque franchiseur, sans mot de passe à définir — il accède directement par le lien reçu.',
  },
  {
    num: '02',
    icon: Gauge,
    title: 'Suivez, en direct',
    desc: 'Score de conformité recalculé à chaque édition, alerte dès qu\'une section attend votre confirmation.',
  },
  {
    num: '03',
    icon: ShieldCheck,
    title: 'Validez, ils avancent',
    desc: 'Vous confirmez la conformité ou signalez un point à corriger — l\'attestation se génère automatiquement.',
  },
];

const FAQS = [
  {
    q: "Qu'est-ce que le DIP ?",
    a: "Le Document d'Information Précontractuelle est obligatoire pour tout franchiseur (Art. L.330-3 Code de commerce). Il doit être remis au candidat franchisé 20 jours avant la signature. Son absence expose à une sanction pénale, et son inexactitude peut entraîner la nullité du contrat si elle a vicié le consentement du franchisé (Cass. com., 20 mars 2007, n°06-11.290) — la responsabilité de votre client est également engagée s'il tait volontairement une information déterminante apparue entre la remise du DIP et la signature, même sur un DIP par ailleurs conforme (Cass. com., 26 juin 2024, n°23-14.085).",
  },
  {
    q: "Combien coûte DIPpro ?",
    a: "1 300 € de mise en place (onboarding personnalisé 1h, configuration de votre espace), une seule fois. L'abonnement mensuel dépend ensuite du nombre de clients franchiseurs suivis : 850 €/mois de 1 à 5 clients, 1 450 €/mois de 6 à 15, 2 200 €/mois de 16 à 30, sur devis au-delà. Première analyse offerte, aucune carte bancaire requise.",
  },
  {
    q: "Que voient mes clients franchiseurs ?",
    a: "Un espace simplifié pour importer ou générer leur DIP et voir leur score de conformité. Toute édition qu'ils font repasse par votre confirmation avant de compter comme conforme (selon le mode que vous choisissez, client par client) — c'est vous qui gardez la vue d'ensemble.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Base de données hébergée en Europe (Supabase / AWS eu-west). JWT + Row Level Security Postgres, chiffrement TLS, audit log immuable. Certains sous-traitants (dont l'analyse IA et l'hébergement applicatif) sont situés hors UE et encadrés par des clauses contractuelles types — détail complet dans notre politique de confidentialité.",
  },
  {
    q: "Qu'est-ce que l'accès anticipé ?",
    a: "Le MVP est fonctionnel et déployé. Les premiers avocats accèdent à toutes les fonctionnalités dès aujourd'hui. En échange de votre retour, vous bénéficiez d'un onboarding personnalisé 1h avec l'équipe et d'un support prioritaire à vie.",
  },
];

// ─── Carte de fonctionnalité — bascule 3D au curseur ──────────────────────────
// Perspective + rotateX/Y pilotés par la position du curseur, icône détachée
// du plan de la carte (translateZ) pour un vrai relief au survol, pas un
// simple hover d'ombre. Repli neutre au clavier / hors survol (rotation 0).
function FeatureCard3D({ icon: Icon, title, desc }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hovering, setHovering] = useState(false);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: py * -12, ry: px * 14 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setTilt({ rx: 0, ry: 0 }); }}
      style={{
        borderRadius: 5, padding: '26px 26px 28px', background: 'rgba(244,242,238,0.03)',
        border: `0.5px solid ${hovering ? 'rgba(156,65,65,0.35)' : 'rgba(244,242,238,0.08)'}`,
        boxShadow: hovering ? '9px 9px 0 rgba(156,65,65,0.20)' : '0 1px 0 rgba(0,0,0,0.2)',
        transformStyle: 'preserve-3d', perspective: 800,
        transform: `perspective(800px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) ${hovering ? 'translateY(-2px)' : ''}`,
        transition: hovering ? 'box-shadow 0.15s ease, border 0.15s ease' : 'transform 0.45s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease, border 0.3s ease',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 4, background: 'rgba(156,65,65,0.12)', border: '0.5px solid rgba(156,65,65,0.28)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        transform: `translateZ(${hovering ? 34 : 0}px)`, transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: hovering ? '0 8px 16px rgba(0,0,0,0.35)' : 'none',
      }}>
        <Icon style={{ width: 19, height: 19, color: GOLD }} />
      </div>
      <div style={{ transform: `translateZ(${hovering ? 14 : 0}px)`, transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)' }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 560, fontSize: 16, color: '#F4F2EE', marginBottom: 7 }}>{title}</h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: 'rgba(244,242,238,0.44)', lineHeight: 1.65 }}>{desc}</p>
      </div>
    </div>
  );
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, className = '', style = {} }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.70s ease ${delay}ms, transform 0.70s ease ${delay}ms`,
      ...style,
    }}>{children}</div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '0.5px solid rgba(156,65,65,0.14)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', gap: 16 }}
      >
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500, color: '#F4F2EE' }}>{q}</span>
        <ChevronDown style={{ width: 16, height: 16, color: GOLD, flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(244,242,238,0.52)', lineHeight: 1.75, paddingBottom: 20, margin: 0 }}>{a}</p>
      )}
    </div>
  );
}

// ─── Dashboard mockup ─────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div style={{
      background: 'rgba(8,8,8,0.97)',
      borderRadius: 20,
      border: '0.5px solid rgba(156,65,65,0.22)',
      padding: 20,
      boxShadow: '0 40px 100px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(156,65,65,0.08)',
      width: '100%',
    }}>
      {/* Traffic lights */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        {['#EF4444', '#FBBF24', '#22C55E'].map(c => (
          <div key={c} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
        ))}
        <div style={{ flex: 1, height: 18, borderRadius: 5, background: 'rgba(244,242,238,0.04)', marginLeft: 8 }} />
      </div>

      {/* Greeting */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 300, color: '#F4F2EE', lineHeight: 1 }}>
            Bonjour, Maître
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'rgba(156,65,65,0.50)', marginTop: 3, letterSpacing: '0.02em' }}>
            4 réseaux suivis
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500, color: '#9C4141', lineHeight: 1 }}>78%</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 8, color: 'rgba(244,242,238,0.30)', marginTop: 2 }}>score moyen</div>
        </div>
      </div>

      {/* Liste des clients */}
      <div style={{ marginBottom: 12 }}>
        {[
          { name: 'Réseau Lumière',   score: 94, c: '#34D399' },
          { name: 'Café des Halles',  score: 81, c: '#34D399' },
          { name: 'Fitness Park+',    score: 58, c: '#FBBF24' },
          { name: 'Atelier Bois SAS', score: 39, c: '#F87171' },
        ].map(({ name, score, c }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: 'rgba(244,242,238,0.02)', marginBottom: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />
            <div style={{ flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: 'rgba(244,242,238,0.68)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: c, flexShrink: 0 }}>{score}%</div>
          </div>
        ))}
      </div>

      {/* Alerte validation */}
      <div style={{ background: 'rgba(156,65,65,0.05)', border: '0.5px solid rgba(156,65,65,0.18)', borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(156,65,65,0.10)', border: '0.5px solid rgba(156,65,65,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11 }}>✦</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 500, color: 'rgba(244,242,238,0.85)' }}>1 section en attente de votre validation</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 8, color: 'rgba(244,242,238,0.36)', marginTop: 1 }}>Fitness Park+ — Section 4</div>
        </div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 8, color: '#9C4141', background: 'rgba(156,65,65,0.10)', border: '0.5px solid rgba(156,65,65,0.22)', borderRadius: 20, padding: '3px 9px', whiteSpace: 'nowrap', flexShrink: 0 }}>Voir →</div>
      </div>
    </div>
  );
}

// ─── Attestation mockup ───────────────────────────────────────────────────────

function AttestationMockup() {
  return (
    <div style={{ background: 'rgba(8,8,8,0.97)', borderRadius: 16, border: '0.5px solid rgba(156,65,65,0.22)', padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
      <div style={{ borderBottom: '0.5px solid rgba(156,65,65,0.20)', paddingBottom: 14, marginBottom: 16 }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(156,65,65,0.60)', marginBottom: 4 }}>ATTESTATION DE MODIFICATION</div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, color: '#F4F2EE' }}>DIPpro — certificat numérique</div>
      </div>

      {[
        { label: 'Effectué le', value: '11 juin 2026 à 14:32', },
        { label: 'Par', value: 'Réseau Lumière SAS', },
        { label: 'SHA-256', value: 'a3f7c8...9e12b4', mono: true },
        { label: 'Score conformité', value: '94 %', gold: true },
      ].map(({ label, value, mono, gold }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '0.5px solid rgba(244,242,238,0.04)' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: 'rgba(244,242,238,0.38)' }}>{label}</span>
          <span style={{
            fontFamily: mono ? 'DM Mono, monospace' : 'DM Sans, sans-serif',
            fontSize: 10,
            color: gold ? '#9C4141' : '#F4F2EE',
          }}>{value}</span>
        </div>
      ))}

      <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(34,197,94,0.06)', border: '0.5px solid rgba(34,197,94,0.20)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CheckCircle style={{ width: 10, height: 10, color: '#34D399' }} />
        </div>
        <div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: '#34D399', fontWeight: 500 }}>3 franchisés notifiés · PDF envoyé</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 8, color: 'rgba(244,242,238,0.35)', marginTop: 1 }}>Lien public vérifiable</div>
        </div>
      </div>
    </div>
  );
}

// ─── Waitlist form (dark) ─────────────────────────────────────────────────────

const LANDING_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function WaitlistFormDark({ onSuccess }) {
  const [form, setForm] = useState({ email: '', company_name: '', phone: '', message: '' });
  const [rgpd, setRgpd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [error, setError] = useState('');
  const partialSent = useRef(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const notifyPartialEmail = () => {
    if (partialSent.current || success || !LANDING_EMAIL_RE.test(form.email)) return;
    partialSent.current = true;
    api.post('/waitlist/partial', { email: form.email, source: 'landing_form' }).catch(() => {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.company_name) { setError('Email et nom de cabinet sont requis.'); return; }
    if (!rgpd) { setError('Veuillez accepter la politique de confidentialité.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/waitlist', { ...form, source: 'standalone' });
      if (res.data.already_exists) setAlreadyExists(true);
      else { setSuccess(true); onSuccess?.(); }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const inputS = {
    background: 'rgba(244,242,238,0.04)',
    border: '0.5px solid rgba(244,242,238,0.12)',
    color: '#F4F2EE',
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 14,
    outline: 'none',
    transition: 'border 0.2s',
    boxSizing: 'border-box',
  };

  if (success || alreadyExists) {
    return (
      <div style={{ textAlign: 'center', padding: '36px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(156,65,65,0.10)', border: '0.5px solid rgba(156,65,65,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle style={{ width: 32, height: 32, color: GOLD }} />
        </div>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 300, color: '#F4F2EE', marginBottom: 12 }}>
          {success ? "Vous êtes sur la liste !" : "Déjà inscrit !"}
        </h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'rgba(244,242,238,0.52)', lineHeight: 1.75, marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
          {success
            ? `Inscription enregistrée pour ${form.email}. Notre équipe vous contactera en priorité dès l'ouverture de l'accès.`
            : `${form.email} est déjà sur notre liste d'attente — vous serez contacté très prochainement.`}
        </p>
        <a href="mailto:theo@iralink-agency.com" style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: GOLD, display: 'block' }}>
          theo@iralink-agency.com
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <div>
          <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(244,242,238,0.45)', display: 'block', marginBottom: 6 }}>
            Cabinet <span style={{ color: '#F87171' }}>*</span>
          </label>
          <input type="text" value={form.company_name} onChange={e => set('company_name', e.target.value)}
            placeholder="Dupont & Associés" required style={inputS}
            onFocus={e => (e.target.style.border = '0.5px solid rgba(156,65,65,0.55)')}
            onBlur={e => (e.target.style.border = '0.5px solid rgba(244,242,238,0.12)')} />
        </div>
        <div>
          <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(244,242,238,0.45)', display: 'block', marginBottom: 6 }}>
            Téléphone <span style={{ color: 'rgba(244,242,238,0.25)' }}>(optionnel)</span>
          </label>
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="+33 6 12 34 56 78" style={inputS}
            onFocus={e => (e.target.style.border = '0.5px solid rgba(156,65,65,0.55)')}
            onBlur={e => (e.target.style.border = '0.5px solid rgba(244,242,238,0.12)')} />
        </div>
      </div>

      <div>
        <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(244,242,238,0.45)', display: 'block', marginBottom: 6 }}>
          Adresse email <span style={{ color: '#F87171' }}>*</span>
        </label>
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
          placeholder="vous@entreprise.fr" required autoComplete="email" style={inputS}
          onFocus={e => (e.target.style.border = '0.5px solid rgba(156,65,65,0.55)')}
          onBlur={e => { e.target.style.border = '0.5px solid rgba(244,242,238,0.12)'; notifyPartialEmail(); }} />
      </div>

      <div>
        <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(244,242,238,0.45)', display: 'block', marginBottom: 6 }}>
          Message <span style={{ color: 'rgba(244,242,238,0.25)' }}>(optionnel)</span>
        </label>
        <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={3}
          placeholder="Parlez-nous de vos clients franchiseurs, de vos besoins DIP..."
          style={{ ...inputS, resize: 'none' }}
          onFocus={e => (e.target.style.border = '0.5px solid rgba(156,65,65,0.55)')}
          onBlur={e => (e.target.style.border = '0.5px solid rgba(244,242,238,0.12)')} />
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={rgpd}
          onChange={e => setRgpd(e.target.checked)}
          style={{ width: 16, height: 16, marginTop: 1, flexShrink: 0, accentColor: GOLD, cursor: 'pointer' }}
        />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(244,242,238,0.40)', lineHeight: 1.6 }}>
          J&apos;accepte que mes données soient utilisées pour me contacter au sujet de DIPpro.
          {' '}<Link to="/privacy" style={{ color: GOLD }}>Politique de confidentialité</Link>.
        </span>
      </label>

      {error && (
        <div style={{ borderRadius: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.22)', color: '#F87171', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !form.email || !form.company_name || !rgpd}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '15px 24px', borderRadius: 12, border: 'none',
          cursor: loading || !form.email || !form.company_name || !rgpd ? 'not-allowed' : 'pointer',
          background: form.email && form.company_name && rgpd ? GOLD : 'rgba(156,65,65,0.25)',
          color: form.email && form.company_name && rgpd ? '#080808' : 'rgba(156,65,65,0.55)',
          fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600,
          boxShadow: form.email && form.company_name && rgpd ? '0 6px 24px rgba(156,65,65,0.28)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        {loading
          ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(8,8,8,0.4)', borderTopColor: '#080808', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Inscription…</>
          : <><Send style={{ width: 16, height: 16 }} /> M&apos;inscrire sur la liste d&apos;attente</>}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}

// ─── Formulaire de contact (dark) ──────────────────────────────────────────────

function ContactFormDark({ onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { setError('Nom, email et message sont requis.'); return; }
    setLoading(true);
    try {
      await api.post('/contact', form);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const inputS = {
    background: 'rgba(244,242,238,0.04)',
    border: '0.5px solid rgba(244,242,238,0.12)',
    color: '#F4F2EE',
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 14,
    outline: 'none',
    transition: 'border 0.2s',
    boxSizing: 'border-box',
  };

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(156,65,65,0.10)', border: '0.5px solid rgba(156,65,65,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <CheckCircle style={{ width: 26, height: 26, color: GOLD }} />
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'rgba(244,242,238,0.65)' }}>
          Message envoyé — nous vous répondrons rapidement.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="Votre nom *" required style={inputS}
          onFocus={e => (e.target.style.border = '0.5px solid rgba(156,65,65,0.55)')}
          onBlur={e => (e.target.style.border = '0.5px solid rgba(244,242,238,0.12)')} />
        <input type="text" value={form.company} onChange={e => set('company', e.target.value)}
          placeholder="Société (optionnel)" style={inputS}
          onFocus={e => (e.target.style.border = '0.5px solid rgba(156,65,65,0.55)')}
          onBlur={e => (e.target.style.border = '0.5px solid rgba(244,242,238,0.12)')} />
      </div>
      <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
        placeholder="vous@entreprise.fr *" required autoComplete="email" style={inputS}
        onFocus={e => (e.target.style.border = '0.5px solid rgba(156,65,65,0.55)')}
        onBlur={e => (e.target.style.border = '0.5px solid rgba(244,242,238,0.12)')} />
      <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={3}
        placeholder="Votre message *" required style={{ ...inputS, resize: 'none' }}
        onFocus={e => (e.target.style.border = '0.5px solid rgba(156,65,65,0.55)')}
        onBlur={e => (e.target.style.border = '0.5px solid rgba(244,242,238,0.12)')} />

      {error && (
        <div style={{ borderRadius: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.22)', color: '#F87171', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !form.name || !form.email || !form.message}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '14px 24px', borderRadius: 12, border: 'none',
          cursor: loading || !form.name || !form.email || !form.message ? 'not-allowed' : 'pointer',
          background: form.name && form.email && form.message ? GOLD : 'rgba(156,65,65,0.25)',
          color: form.name && form.email && form.message ? '#080808' : 'rgba(156,65,65,0.55)',
          fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        {loading
          ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(8,8,8,0.4)', borderTopColor: '#080808', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Envoi…</>
          : <><Send style={{ width: 16, height: 16 }} /> Envoyer le message</>}
      </button>
    </form>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function LandingPage() {
  usePageBackground(DARK_BG.background);
  const formRef = useRef(null);
  const [waitlistCount, setWaitlistCount] = useState(null);
  const [formDone, setFormDone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const NAV_LINKS = [['#comment', 'Comment ça marche'], ['#fonctionnalites', 'Fonctionnalités'], ['#faq', 'FAQ']];

  useEffect(() => {
    api.get('/waitlist/count').then(r => setWaitlistCount(r.data?.count)).catch(() => {});
  }, []);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const btnGold = {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    background: GOLD, color: '#F4ECE9',
    fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600,
    padding: '14px 28px', borderRadius: 2,
    cursor: 'pointer', border: 'none', textDecoration: 'none',
    boxShadow: '10px 10px 0 rgba(156,65,65,0.24)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  };

  const btnGhost = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(244,242,238,0.05)', border: '0.5px solid rgba(244,242,238,0.14)',
    color: 'rgba(244,242,238,0.65)',
    fontFamily: 'DM Sans, sans-serif', fontSize: 14,
    padding: '14px 24px', borderRadius: 2,
    cursor: 'pointer', textDecoration: 'none', transition: 'background 0.15s',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Comment utiliser DIPpro pour suivre la conformité DIP de ses clients franchiseurs',
    description: 'Suivez la conformité DIP de tous vos clients franchiseurs en 3 étapes grâce à DIPpro.',
    step: HOW_STEPS.map(({ num, title, desc }) => ({
      '@type': 'HowToStep',
      position: parseInt(num),
      name: title,
      text: desc,
    })),
  };

  return (
    <>
      <Helmet>
        <title>DIPpro — Conformité DIP pour cabinets d'avocats en droit de la franchise</title>
        <meta name="description" content="DIPpro centralise la conformité DIP de tous vos clients franchiseurs : score en direct par client, validation de chaque modification, attestation PDF certifiée SHA-256. Pour avocats en droit de la franchise." />
        <link rel="canonical" href="https://iralink-agency.dippro.business/" />
        <meta property="og:url" content="https://iralink-agency.dippro.business/" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
      </Helmet>
    <div className="min-h-screen" style={DARK_BG}>

      {/* ── HEADER ───────────────────────────────────────────── */}
      <header style={{ background: 'rgba(8,8,8,0.72)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '0.5px solid rgba(156,65,65,0.14)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(156,65,65,0.12)', border: '0.5px solid rgba(156,65,65,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield style={{ width: 16, height: 16, color: GOLD }} />
            </div>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: '#F4F2EE' }}>DIPpro</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(244,242,238,0.28)' }}>by Iralink</span>
          </div>

          {/* Nav desktop */}
          <nav style={{ alignItems: 'center', gap: 24 }} className="hidden md:flex">
            {NAV_LINKS.map(([href, label]) => (
              <a key={href} href={href} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(244,242,238,0.42)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.target.style.color = '#F4F2EE')}
                onMouseLeave={e => (e.target.style.color = 'rgba(244,242,238,0.42)')}>
                {label}
              </a>
            ))}
          </nav>

          {/* Right CTA — ordinateurs et tablettes */}
          <div style={{ alignItems: 'center', gap: 10 }} className="hidden md:flex">
            <Link to="/login" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(244,242,238,0.40)', textDecoration: 'none' }}>
              Connexion
            </Link>
            <button onClick={scrollToForm} style={btnGold}>
              Liste d&apos;attente <ArrowRight style={{ width: 15, height: 15 }} />
            </button>
          </div>

          {/* Hamburger — mobile uniquement */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="md:hidden flex items-center justify-center"
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(156,65,65,0.10)', border: '0.5px solid rgba(156,65,65,0.30)',
              color: GOLD, cursor: 'pointer',
            }}
          >
            {menuOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
          </button>
        </div>

        {/* Panneau menu mobile */}
        {menuOpen && (
          <div
            className="md:hidden flex flex-col"
            style={{
              borderTop: '0.5px solid rgba(156,65,65,0.14)',
              background: 'rgba(8,8,8,0.96)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              padding: '8px 16px 20px',
              gap: 4,
            }}
          >
            {NAV_LINKS.map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: 'rgba(244,242,238,0.75)',
                  textDecoration: 'none', padding: '14px 8px', borderRadius: 8,
                  borderBottom: '0.5px solid rgba(244,242,238,0.06)',
                }}
              >
                {label}
              </a>
            ))}
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: 'rgba(244,242,238,0.75)',
                textDecoration: 'none', padding: '14px 8px', borderRadius: 8,
              }}
            >
              Connexion
            </Link>
            <button
              onClick={() => { setMenuOpen(false); scrollToForm(); }}
              style={{ ...btnGold, width: '100%', justifyContent: 'center', marginTop: 10 }}
            >
              Liste d&apos;attente <ArrowRight style={{ width: 15, height: 15 }} />
            </button>
          </div>
        )}
      </header>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px 56px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48, alignItems: 'center' }} className="lg:flex-row lg:gap-16 lg:items-center">

          {/* Texte */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <FadeIn>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 20, background: 'rgba(156,65,65,0.10)', border: '0.5px solid rgba(156,65,65,0.28)', marginBottom: 28 }}>
                <CheckCircle style={{ width: 13, height: 13, color: GOLD }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: GOLD }}>
                  MVP lancé · Accès anticipé ouvert
                  {waitlistCount != null && waitlistCount > 0 && (
                    <> · <span style={{ color: '#F4F2EE' }}>{waitlistCount} inscrits</span></>
                  )}
                </span>
              </div>

              <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(2.5rem, 5.5vw, 4rem)', color: '#F4F2EE', lineHeight: 1.07, marginBottom: 22 }}>
                Tous vos clients franchiseurs.<br />
                <span style={{ color: GOLD }}>Une seule vue de conformité.</span>
              </h1>

              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: 'rgba(244,242,238,0.52)', lineHeight: 1.7, maxWidth: 460, marginBottom: 36 }}>
                L&apos;outil qui centralise la conformité DIP de votre portefeuille de clients
                franchiseurs selon la Loi Doubin — Art. L.330-3 du Code de commerce. Vous gardez
                la main sur chaque modification, avec attestation horodatée SHA-256 à l&apos;appui.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 40 }}>
                <button onClick={scrollToForm} style={btnGold}>
                  <Send style={{ width: 16, height: 16 }} />
                  Rejoindre la liste d&apos;attente
                </button>
                <a href="#comment" style={btnGhost}>
                  Voir comment ça marche
                </a>
              </div>

              {/* Trust badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
                {['Loi Doubin 1989', 'Art. L.330-3', 'Sous-traitants encadrés RGPD', 'Base de données en Europe'].map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(244,242,238,0.35)' }}>
                    <CheckCircle style={{ width: 13, height: 13, color: '#34D399', flexShrink: 0 }} />
                    {b}
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Mockup */}
          <div style={{ width: '100%', maxWidth: 440, flexShrink: 0 }}>
            <FadeIn delay={180}>
              <DashboardMockup />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 64px' }}>
        <FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, borderRadius: 20, overflow: 'hidden', border: '0.5px solid rgba(156,65,65,0.14)', background: 'rgba(156,65,65,0.08)' }}>
            {[
              { val: 'SHA-256', label: 'empreinte vérifiable par attestation', icon: FileCheck, iconColor: '#F87171' },
              { val: '20 jours', label: 'délai légal avant signature', icon: Clock, iconColor: GOLD },
              { val: '10', label: 'sections réglementaires analysées', icon: FileText, iconColor: GOLD },
              { val: '30 s', label: 'pour une analyse complète IA', icon: Sparkles, iconColor: '#34D399' },
            ].map(({ val, label, icon: Icon, iconColor }) => (
              <div key={val} style={{ background: 'rgba(8,8,8,0.80)', padding: '28px 24px', textAlign: 'center' }}>
                <Icon style={{ width: 18, height: 18, color: iconColor, margin: '0 auto 12px' }} />
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 300, color: '#F4F2EE', lineHeight: 1 }}>{val}</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(244,242,238,0.38)', marginTop: 6, lineHeight: 1.5 }}>{label}</div>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ── URGENCE LÉGALE ───────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 72px' }}>
        <FadeIn>
          <div style={{ borderRadius: 22, padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: 24, background: 'rgba(239,68,68,0.05)', border: '0.5px solid rgba(239,68,68,0.22)' }} className="md:flex-row md:items-center">
            <div style={{ flex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(239,68,68,0.10)', border: '0.5px solid rgba(239,68,68,0.22)', marginBottom: 16 }}>
                <AlertTriangle style={{ width: 12, height: 12, color: '#F87171' }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#F87171' }}>Jurisprudence récente</span>
              </div>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#F4F2EE', lineHeight: 1.1, marginBottom: 14 }}>
                Arrêt Cour de cassation — 26 juin 2024
              </h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'rgba(244,242,238,0.50)', lineHeight: 1.7, maxWidth: 520 }}>
                La Cour de cassation a confirmé que l'obligation d'information de vos clients ne s'arrête pas à la
                remise du DIP : taire volontairement un fait déterminant survenu avant la signature — même avec un
                DIP par ailleurs conforme — constitue un dol qui engage leur responsabilité (Cass. com., 26 juin
                2024, n°23-14.085).
              </p>
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(2rem, 4vw, 2.8rem)', color: '#F87171', lineHeight: 1.1 }}>
                Jusqu&apos;à la signature
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(244,242,238,0.38)', marginTop: 4 }}>
                durée réelle de l&apos;obligation d&apos;information
              </div>
              <button onClick={scrollToForm} style={{ ...btnGold, marginTop: 20, padding: '12px 22px', fontSize: 13 }}>
                Protégez vos clients
              </button>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── COMMENT ÇA MARCHE ────────────────────────────────── */}
      <section id="comment" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(2rem, 4vw, 2.8rem)', color: '#F4F2EE', marginBottom: 12 }}>
              Comment ça marche
            </h2>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: 'rgba(244,242,238,0.42)' }}>
              De l&apos;invitation du client à l&apos;attestation certifiée.
            </p>
          </div>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          {HOW_STEPS.map(({ num, icon: Icon, title, desc }, i) => (
            <FadeIn key={num} delay={i * 80}>
              <div style={{ borderRadius: 22, padding: '32px 28px', background: 'rgba(156,65,65,0.03)', border: '0.5px solid rgba(156,65,65,0.11)', position: 'relative', overflow: 'hidden', height: '100%', boxSizing: 'border-box' }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: '4.5rem', color: 'rgba(156,65,65,0.15)', lineHeight: 1, marginBottom: 20 }}>{num}</div>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(156,65,65,0.10)', border: '0.5px solid rgba(156,65,65,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <Icon style={{ width: 18, height: 18, color: GOLD }} />
                </div>
                <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 16, color: '#F4F2EE', marginBottom: 10 }}>{title}</h3>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(244,242,238,0.45)', lineHeight: 1.7 }}>{desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ──────────────────────────────────── */}
      <section id="fonctionnalites" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(2rem, 4vw, 2.8rem)', color: '#F4F2EE', marginBottom: 12 }}>
              Tout ce dont vous avez besoin
            </h2>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: 'rgba(244,242,238,0.42)', maxWidth: 480, margin: '0 auto' }}>
              Analyse fondée sur la grille R.330-1 et la jurisprudence de la Cour de cassation, avec citation systématique de la sous-disposition exacte.
            </p>
          </div>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <FadeIn key={title} delay={i * 55}>
              <FeatureCard3D icon={Icon} title={title} desc={desc} />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── ATTESTATION SPOTLIGHT ─────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <FadeIn>
          <div style={{ borderRadius: 28, padding: '48px 40px', background: 'rgba(156,65,65,0.04)', border: '0.5px solid rgba(156,65,65,0.16)', display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center' }} className="md:flex-row md:gap-16">
            <div style={{ flex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(156,65,65,0.10)', border: '0.5px solid rgba(156,65,65,0.22)', marginBottom: 20 }}>
                <FileCheck style={{ width: 12, height: 12, color: GOLD }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: GOLD }}>Nouveau · Attestation certifiée</span>
              </div>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', color: '#F4F2EE', lineHeight: 1.1, marginBottom: 16 }}>
                Preuve de remise incontestable
              </h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'rgba(244,242,238,0.50)', lineHeight: 1.75, marginBottom: 24 }}>
                Chaque modification validée par vous génère automatiquement un certificat PDF horodaté
                avec empreinte SHA-256, numéroté sans trou dans une série continue. Un lien public
                vérifiable — par le franchisé, le tribunal ou toute partie au litige — sans authentification.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Certificat PDF horodaté et signé cryptographiquement',
                  'Lien public accessible sans compte',
                  'Numérotation séquentielle — aucun trou possible dans la série',
                  'Archivage permanent — preuve légale en cas de litige',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <CheckCircle style={{ width: 15, height: 15, color: '#34D399', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(244,242,238,0.55)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: '100%', maxWidth: 340, flexShrink: 0 }}>
              <AttestationMockup />
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── PRICING (paliers par nombre de clients) ─────────────── */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 64px' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(2rem, 4vw, 2.6rem)', color: '#F4F2EE', marginBottom: 12 }}>
              Tarification par paliers
            </h2>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'rgba(244,242,238,0.40)' }}>
              1 300 € de mise en place, une seule fois — puis un abonnement mensuel proportionné au nombre de clients franchiseurs suivis.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            {[
              { label: '1 à 5 clients', price: '850 €' },
              { label: '6 à 15 clients', price: '1 450 €' },
              { label: '16 à 30 clients', price: '2 200 €' },
              { label: '31 clients et plus', price: 'Sur devis' },
            ].map((tier, i) => (
              <div key={tier.label} style={{ borderRadius: 18, padding: '24px 20px', background: i === 0 ? 'rgba(156,65,65,0.08)' : 'rgba(244,242,238,0.025)', border: `0.5px solid ${i === 0 ? 'rgba(156,65,65,0.30)' : 'rgba(244,242,238,0.07)'}`, textAlign: 'center' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10.5, color: 'rgba(244,242,238,0.40)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{tier.label}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 300, color: GOLD, lineHeight: 1 }}>
                  {tier.price}{tier.price !== 'Sur devis' && <span style={{ fontSize: 14, opacity: 0.6 }}>/mois</span>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
            {/* Carte prix */}
            <div style={{ borderRadius: 22, padding: '36px 32px', background: 'rgba(156,65,65,0.06)', border: '0.5px solid rgba(156,65,65,0.28)', boxSizing: 'border-box' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'rgba(156,65,65,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Mise en place</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 42, fontWeight: 300, color: GOLD, lineHeight: 1 }}>1 300 €</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(244,242,238,0.38)', marginTop: 4 }}>une seule fois, quel que soit le palier</div>
              </div>
              <div style={{ height: '0.5px', background: 'rgba(156,65,65,0.15)', marginBottom: 24 }} />
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'rgba(156,65,65,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>À partir de</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 42, fontWeight: 300, color: GOLD, lineHeight: 1 }}>850 €<span style={{ fontSize: 18, opacity: 0.6 }}>/mois</span></div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(244,242,238,0.38)', marginTop: 4 }}>selon le nombre de clients franchiseurs suivis (voir paliers ci-dessus)</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {['Onboarding personnalisé 1h avec l\'équipe', 'Changement de palier automatique et transparent', 'Configuration complète de votre espace', 'Support prioritaire à vie'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <CheckCircle style={{ width: 14, height: 14, color: GOLD, flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: 'rgba(244,242,238,0.55)', lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={scrollToForm} style={{ ...btnGold, width: '100%', justifyContent: 'center', padding: '13px 24px', marginTop: 28 }}>
                Première analyse offerte →
              </button>
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10.5, color: 'rgba(244,242,238,0.25)', textAlign: 'center', marginTop: 10 }}>Aucune carte bancaire requise</p>
            </div>

            {/* ROI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderRadius: 16, padding: '24px 28px', background: 'rgba(244,242,238,0.025)', border: '0.5px solid rgba(244,242,238,0.07)' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(244,242,238,0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Le calcul</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: 'rgba(244,242,238,0.45)', lineHeight: 1.4 }}>Coût an 1, palier 1 à 5 clients (mise en place + 12 mois)</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'rgba(244,242,238,0.70)', flexShrink: 0 }}>11 500 €</span>
                </div>
                <div style={{ height: '0.5px', background: 'rgba(156,65,65,0.15)', margin: '4px 0 14px' }} />
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: 'rgba(244,242,238,0.50)', lineHeight: 1.6, margin: 0 }}>
                  Un contentieux DIP peut exposer votre client à la restitution des droits d&apos;entrée et redevances perçus, ainsi qu&apos;à des dommages-intérêts — sans qu&apos;un montant moyen ne soit publiquement établi. La grille R.330-1 sert à réduire ce risque en amont, pas à le chiffrer.
                </p>
              </div>
              <div style={{ borderRadius: 16, padding: '24px 28px', background: 'rgba(244,242,238,0.025)', border: '0.5px solid rgba(244,242,238,0.07)' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(244,242,238,0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Garantie</div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(244,242,238,0.50)', lineHeight: 1.65, margin: 0 }}>
                  Première analyse offerte sur le DIP d&apos;un de vos clients — vous recevez le rapport complet avant de prendre toute décision. Aucun engagement, aucune carte bancaire.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── WAITLIST FORM ────────────────────────────────────── */}
      <section ref={formRef} style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px 88px' }}>
        <FadeIn>
          <div style={{ borderRadius: 28, padding: '48px 40px', background: 'rgba(244,242,238,0.025)', border: '0.5px solid rgba(156,65,65,0.22)', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 20, background: 'rgba(156,65,65,0.10)', border: '0.5px solid rgba(156,65,65,0.22)', marginBottom: 20 }}>
                <Star style={{ width: 12, height: 12, color: GOLD }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: GOLD }}>
                  Accès anticipé
                  {waitlistCount != null && waitlistCount > 0 && (
                    <> · {waitlistCount} inscrits</>
                  )}
                </span>
              </div>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', color: '#F4F2EE', marginBottom: 12 }}>
                Rejoignez la liste d&apos;attente
              </h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: 'rgba(244,242,238,0.45)', lineHeight: 1.7 }}>
                Inscrivez-vous pour être contacté en priorité et recevoir votre première analyse DIP gratuitement.
              </p>
            </div>

            <WaitlistFormDark onSuccess={() => setFormDone(true)} />

            {/* Footer form */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '0.5px solid rgba(156,65,65,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 18 }}>
                {[['🔒', 'Données confidentielles'], ['🇪🇺', 'Base de données en Europe'], ['✉', 'Zéro spam']].map(([icon, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans, sans-serif', fontSize: 11.5, color: 'rgba(244,242,238,0.28)' }}>
                    <span>{icon}</span> {label}
                  </div>
                ))}
              </div>
              <Link to="/login" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: GOLD, textDecoration: 'none' }}>
                Déjà un compte ? →
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── RESSOURCES ───────────────────────────────────────── */}
      <section id="ressources" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 88px' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(2rem, 4vw, 2.6rem)', color: '#F4F2EE' }}>
              Comprendre le DIP et la Loi Doubin
            </h2>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'rgba(244,242,238,0.42)', marginTop: 12, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
              Nos guides juridiques de référence, sourcés et vérifiés — pour votre veille comme pour celle de vos clients.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              {
                href: '/blog/dip-non-conforme-risques-sanctions',
                title: 'DIP non conforme : quels risques réels en 2026 ?',
                desc: 'Sanction pénale, nullité, dol postérieur à la remise du DIP : ce que dit vraiment la jurisprudence.',
              },
              {
                href: '/blog/dip-franchise-guide-loi-doubin',
                title: 'DIP franchise : le guide complet de la Loi Doubin',
                desc: 'Les 10 sections obligatoires, le délai des 20 jours, les sanctions — le guide de référence.',
              },
              {
                href: '/blog/nullite-contrat-franchise-dip',
                title: 'Nullité du contrat de franchise : ce qu\'il faut savoir',
                desc: 'Dans quels cas un DIP défaillant peut réellement conduire à l\'annulation du contrat.',
              },
            ].map(({ href, title, desc }) => (
              <a
                key={href}
                href={href}
                style={{
                  display: 'block', borderRadius: 18, padding: 24, textDecoration: 'none',
                  background: 'rgba(244,242,238,0.02)', border: '0.5px solid rgba(244,242,238,0.08)',
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(156,65,65,0.35)'; e.currentTarget.style.background = 'rgba(156,65,65,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(244,242,238,0.08)'; e.currentTarget.style.background = 'rgba(244,242,238,0.02)'; }}
              >
                <BookOpen style={{ width: 18, height: 18, color: GOLD, marginBottom: 14 }} />
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 500, color: '#F4F2EE', marginBottom: 8, lineHeight: 1.35 }}>
                  {title}
                </p>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(244,242,238,0.42)', lineHeight: 1.5 }}>
                  {desc}
                </p>
              </a>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <a href="/blog" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: GOLD, textDecoration: 'none' }}>
              Voir tous les articles →
            </a>
          </div>
        </FadeIn>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 88px' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(2rem, 4vw, 2.6rem)', color: '#F4F2EE' }}>
              Questions fréquentes
            </h2>
          </div>
          <div style={{ borderRadius: 22, padding: '8px 32px', background: 'rgba(244,242,238,0.02)', border: '0.5px solid rgba(244,242,238,0.07)' }}>
            {FAQS.map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}
          </div>
        </FadeIn>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 88px' }}>
        <FadeIn>
          <div style={{ borderRadius: 28, padding: '60px 48px', textAlign: 'center', background: 'rgba(156,65,65,0.05)', border: '0.5px solid rgba(156,65,65,0.20)' }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(2rem, 4vw, 2.8rem)', color: '#F4F2EE', lineHeight: 1.1, marginBottom: 16 }}>
              Vos clients méritent<br />mieux que l&apos;approximation.
            </h2>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'rgba(244,242,238,0.42)', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 32px' }}>
              Première analyse offerte. Aucune carte bancaire. Onboarding personnalisé inclus.
            </p>
            {!contactOpen ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
                <button onClick={scrollToForm} style={{ ...btnGold, fontSize: 15, padding: '16px 36px' }}>
                  Rejoindre la liste d&apos;attente
                  <ArrowRight style={{ width: 18, height: 18 }} />
                </button>
                <button onClick={() => setContactOpen(true)} style={{ ...btnGhost, fontSize: 13, cursor: 'pointer' }}>
                  Contacter l&apos;équipe
                </button>
              </div>
            ) : (
              <div style={{ maxWidth: 440, margin: '0 auto', textAlign: 'left' }}>
                <ContactFormDark onSuccess={() => {}} />
              </div>
            )}
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ borderTop: '0.5px solid rgba(156,65,65,0.10)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Shield style={{ width: 16, height: 16, color: GOLD }} />
                <span style={{ fontFamily: 'Fraunces, serif', fontSize: 20, color: '#F4F2EE' }}>DIPpro</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(244,242,238,0.25)' }}>by Iralink-Agency</span>
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(244,242,238,0.28)', lineHeight: 1.6, maxWidth: 260 }}>
                Outil de conformité DIP pour cabinets d&apos;avocats en droit de la franchise.
                Développé par Iralink-Agency — société en cours de création.
              </p>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgba(244,242,238,0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Produit</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['#fonctionnalites', 'Fonctionnalités'], ['#comment', 'Comment ça marche'], ['#faq', 'FAQ'], ['/blog', 'Blog']].map(([href, label]) => (
                    <a key={href} href={href} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(244,242,238,0.32)', textDecoration: 'none' }}
                      onMouseEnter={e => (e.target.style.color = 'rgba(244,242,238,0.65)')}
                      onMouseLeave={e => (e.target.style.color = 'rgba(244,242,238,0.32)')}>
                      {label}
                    </a>
                  ))}
                  <Link to="/ressources/litiges-dip" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(244,242,238,0.32)', textDecoration: 'none' }}
                    onMouseEnter={e => (e.target.style.color = 'rgba(244,242,238,0.65)')}
                    onMouseLeave={e => (e.target.style.color = 'rgba(244,242,238,0.32)')}>
                    Base des litiges DIP
                  </Link>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgba(244,242,238,0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Légal</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['/privacy', 'Confidentialité'], ['/cgu', 'CGU'], ['/mentions-legales', 'Mentions légales']].map(([to, label]) => (
                    <Link key={to} to={to} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(244,242,238,0.32)', textDecoration: 'none' }}
                      onMouseEnter={e => (e.target.style.color = 'rgba(244,242,238,0.65)')}
                      onMouseLeave={e => (e.target.style.color = 'rgba(244,242,238,0.32)')}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgba(244,242,238,0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Contact</div>
                <a href="mailto:theo@iralink-agency.com" style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: GOLD, textDecoration: 'none', display: 'block', marginBottom: 8 }}>
                  theo@iralink-agency.com
                </a>
                <Link to="/login" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(244,242,238,0.32)', textDecoration: 'none' }}>
                  Connexion
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div style={{ paddingTop: 20, borderTop: '0.5px solid rgba(244,242,238,0.05)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(244,242,238,0.20)' }}>
              © {new Date().getFullYear()} Iralink-Agency — Société en cours de création · DIPpro
            </span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(244,242,238,0.15)' }}>
              Loi Doubin Art. L.330-3 · Décret n°2023-1394 · RGPD
            </span>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
