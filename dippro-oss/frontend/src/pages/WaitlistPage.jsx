import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LiquidGlassBtn from '../components/ui/LiquidGlassBtn';
import SEOHead from '../components/SEOHead';
import {
  Shield, CheckCircle, Send, ArrowLeft, ArrowRight,
  Sparkles, Bell, Users, Download, TrendingUp, Lock,
  Star, FileText, Zap, Clock, ChevronRight,
} from 'lucide-react';
import api from '../lib/api';
import usePageBackground from '../lib/usePageBackground';

const GOLD = '#9C4141';
const DARK = '#1A1826';
const GLASS = 'rgba(255,255,255,0.82)';
const BG = 'linear-gradient(145deg, #dde2f5 0%, #ebe7fa 40%, #dceaf8 70%, #e3e1f6 100%)';

const BENEFITS = [
  { icon: Star, label: 'Accès prioritaire dès ouverture', desc: 'Vous êtes notifié en premier et activé avant tout le monde.' },
  { icon: TrendingUp, label: 'Tarif Early Adopter', desc: 'Tarification préférentielle réservée aux inscrits avant ouverture.' },
  { icon: Sparkles, label: 'Onboarding personnalisé Iralink', desc: "Mise en route en 1h avec l'équipe — pas de débrouille." },
  { icon: FileText, label: 'Analyse gratuite de votre DIP actuel', desc: 'Offerte à tous les inscrits — valeur 250€.' },
];

const FEATURES = [
  { icon: Sparkles, label: 'Analyse IA en 30 s', desc: 'Score de conformité Loi Doubin en un clic sur votre DIP existant.' },
  { icon: Shield, label: 'Génération guidée', desc: 'Formulaire intelligent + assistant IA qui rédige les sections complexes.' },
  { icon: Bell, label: 'Alertes renouvellement', desc: 'Rappels automatiques 90, 30 et 7 jours avant expiration.' },
  { icon: Users, label: 'Portail franchisé', desc: 'Lien sécurisé, accusé de réception horodaté, zero papier.' },
  { icon: Zap, label: 'Détection des changements', desc: "L'IA signale chaque modification à notifier légalement aux franchisés." },
  { icon: Download, label: 'Export DOCX & PDF', desc: 'Documents prêts pour signature et archivage légal.' },
];

function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function FadeIn({ children, delay = 0, className = '' }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

/* ─── Mockup composants ─────────────────────────────────────── */

function AppChrome({ children, url = 'app.dippro.fr/dashboard' }) {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 80px rgba(30,20,60,0.22)', border: '1px solid rgba(255,255,255,0.4)' }}>
      <div style={{ background: 'rgba(26,24,38,0.98)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: '3px 12px', marginLeft: 8 }}>
          <span style={{ color: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }}>{url}</span>
        </div>
      </div>
      <div style={{ background: BG }}>
        {children}
      </div>
    </div>
  );
}

function MockupDashboard() {
  const sections = [
    { num: 1, label: "Présentation franchiseur", score: 95, status: 'conforme' },
    { num: 2, label: "Historique dirigeant", score: 88, status: 'conforme' },
    { num: 3, label: "État du réseau", score: 72, status: 'partiel' },
    { num: 4, label: "Comptes annuels", score: 45, status: 'incomplet' },
    { num: 5, label: "Marque & Propriété intellectuelle", score: 91, status: 'conforme' },
  ];
  const statusColor = { conforme: '#22C55E', partiel: GOLD, incomplet: '#EF4444' };
  const statusBg = { conforme: 'rgba(34,197,94,0.12)', partiel: 'rgba(156,65,65,0.12)', incomplet: 'rgba(239,68,68,0.12)' };

  return (
    <AppChrome url="app.dippro.fr/dashboard">
      <div style={{ display: 'flex', minHeight: 300 }}>
        {/* Sidebar mini */}
        <div style={{ width: 52, background: 'rgba(26,24,38,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 14 }}>
          {[Shield, FileText, Bell, Users, TrendingUp].map((Icon, i) => (
            <div key={i} style={{ width: 30, height: 30, borderRadius: 8, background: i === 0 ? 'rgba(156,65,65,0.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon style={{ width: 14, height: 14, color: i === 0 ? GOLD : '#475569' }} />
            </div>
          ))}
        </div>
        {/* Content */}
        <div style={{ flex: 1, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DARK }}>Tableau de bord</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#EF4444' }}>2 alertes</span>
              </div>
            </div>
          </div>
          {/* Score card */}
          <div style={{ borderRadius: 12, padding: '12px 14px', background: GLASS, border: '1px solid rgba(156,65,65,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: 56, height: 56 }}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(156,65,65,0.15)" strokeWidth="5" />
                <circle cx="28" cy="28" r="22" fill="none" stroke={GOLD} strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 22 * 0.78} ${2 * Math.PI * 22}`}
                  strokeLinecap="round" strokeDashoffset={2 * Math.PI * 22 * 0.25}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
              </svg>
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, color: GOLD }}>78%</span>
            </div>
            <div>
              <p style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#64748B', marginBottom: 2 }}>Score global de conformité</p>
              <p style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 600, color: DARK }}>DIP Ma Franchise SAS — 2025</p>
              <p style={{ fontFamily: 'monospace', fontSize: 9, color: '#94A3B8' }}>Analysé le 23/05/2025</p>
            </div>
          </div>
          {/* Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {sections.map(s => (
              <div key={s.num} style={{ borderRadius: 8, padding: '7px 10px', background: GLASS, border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(156,65,65,0.5)', width: 12 }}>{s.num}</span>
                <span style={{ flex: 1, fontFamily: 'DM Sans', fontSize: 9, color: '#475569' }}>{s.label}</span>
                <div style={{ padding: '2px 6px', borderRadius: 4, background: statusBg[s.status] }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 8, color: statusColor[s.status] }}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppChrome>
  );
}

function MockupGenerate() {
  const chips = ['SAS', 'SARL', 'SA', 'EURL'];
  return (
    <AppChrome url="app.dippro.fr/dip/generate">
      <div style={{ display: 'flex', minHeight: 300 }}>
        <div style={{ width: 52, background: 'rgba(26,24,38,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 14 }}>
          {[Shield, FileText, Bell, Users, TrendingUp].map((Icon, i) => (
            <div key={i} style={{ width: 30, height: 30, borderRadius: 8, background: i === 1 ? 'rgba(156,65,65,0.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon style={{ width: 14, height: 14, color: i === 1 ? GOLD : '#475569' }} />
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: DARK }}>Générer un DIP</span>
            <div style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(156,65,65,0.1)', border: '1px solid rgba(156,65,65,0.25)' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 8, color: GOLD }}>Étape 1/8</span>
            </div>
          </div>
          {/* Progress */}
          <div style={{ height: 3, background: 'rgba(156,65,65,0.15)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: '12%', height: '100%', background: GOLD, borderRadius: 99 }} />
          </div>
          {/* Identité card */}
          <div style={{ borderRadius: 12, padding: '12px', background: GLASS, border: '1px solid rgba(255,255,255,0.5)' }}>
            <p style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600, color: DARK, marginBottom: 10 }}>Identité du franchiseur</p>
            {/* Raison sociale field */}
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontFamily: 'DM Sans', fontSize: 9, color: '#64748B', marginBottom: 4 }}>Raison sociale</p>
              <div style={{ borderRadius: 8, padding: '7px 10px', background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(156,65,65,0.4)' }}>
                <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: DARK }}>Ma Franchise SAS</span>
              </div>
            </div>
            {/* Forme juridique — chips */}
            <div>
              <p style={{ fontFamily: 'DM Sans', fontSize: 9, color: '#64748B', marginBottom: 4 }}>Forme juridique</p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {chips.map(c => (
                  <div key={c} style={{ padding: '4px 10px', borderRadius: 7, background: c === 'SAS' ? GOLD : 'rgba(255,255,255,0.8)', border: `1px solid ${c === 'SAS' ? GOLD : 'rgba(200,200,220,0.5)'}`, cursor: 'pointer' }}>
                    <span style={{ fontFamily: 'DM Sans', fontSize: 9, fontWeight: c === 'SAS' ? 600 : 400, color: c === 'SAS' ? DARK : '#64748B' }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* AI button teaser */}
          <div style={{ borderRadius: 10, padding: '8px 12px', background: 'rgba(156,65,65,0.05)', border: '1px solid rgba(156,65,65,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles style={{ width: 12, height: 12, color: GOLD }} />
            <span style={{ fontFamily: 'DM Sans', fontSize: 9, color: GOLD }}>Rédiger avec l&apos;assistant IA</span>
            <ChevronRight style={{ width: 10, height: 10, color: GOLD, marginLeft: 'auto' }} />
          </div>
        </div>
      </div>
    </AppChrome>
  );
}

function MockupAnalysis() {
  const result = [
    { num: 1, label: 'Présentation du franchiseur', score: 95, ok: true },
    { num: 2, label: 'Historique de la direction', score: 82, ok: true },
    { num: 3, label: 'État du réseau de franchisés', score: 68, ok: false },
    { num: 4, label: 'Comptes annuels (3 dernières années)', score: 40, ok: false },
  ];
  return (
    <AppChrome url="app.dippro.fr/dip/upload">
      <div style={{ display: 'flex', minHeight: 300 }}>
        <div style={{ width: 52, background: 'rgba(26,24,38,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 14 }}>
          {[Shield, FileText, Bell, Users, TrendingUp].map((Icon, i) => (
            <div key={i} style={{ width: 30, height: 30, borderRadius: 8, background: i === 0 ? 'rgba(156,65,65,0.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon style={{ width: 14, height: 14, color: i === 0 ? GOLD : '#475569' }} />
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <span style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: DARK }}>Analyse IA — résultats</span>
          {/* Summary card */}
          <div style={{ borderRadius: 12, padding: '10px 12px', background: 'rgba(156,65,65,0.06)', border: '1px solid rgba(156,65,65,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: 'DM Sans', fontSize: 9, color: '#64748B' }}>Score global</span>
              <span style={{ fontFamily: 'DM Sans', fontSize: 16, fontWeight: 700, color: GOLD }}>71%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(156,65,65,0.15)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: '71%', height: '100%', background: GOLD, borderRadius: 99 }} />
            </div>
          </div>
          {/* Section list */}
          {result.map(s => (
            <div key={s.num} style={{ borderRadius: 9, padding: '8px 10px', background: GLASS, border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.ok ? '#22C55E' : '#EF4444', flexShrink: 0 }} />
              <span style={{ flex: 1, fontFamily: 'DM Sans', fontSize: 9, color: '#475569' }}>{s.label}</span>
              <div style={{ padding: '2px 6px', borderRadius: 4, background: s.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 8, color: s.ok ? '#22C55E' : '#EF4444' }}>{s.score}%</span>
              </div>
            </div>
          ))}
          <div style={{ borderRadius: 9, padding: '6px 10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'DM Sans', fontSize: 8, color: '#EF4444' }}>⚠ 3 sections nécessitent des corrections</span>
          </div>
        </div>
      </div>
    </AppChrome>
  );
}

/* ─── Form ──────────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function WaitlistForm() {
  const [form, setForm] = useState({ email: '', company_name: '', phone: '', message: '' });
  const [rgpd, setRgpd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [error, setError] = useState('');
  const partialSent = useRef(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  // Email quitté sans que le formulaire soit complété — relance envoyée une
  // seule fois par chargement de page (le backend déduplique aussi côté
  // serveur, par adresse, de façon permanente).
  const notifyPartialEmail = () => {
    if (partialSent.current || success || !EMAIL_RE.test(form.email)) return;
    partialSent.current = true;
    api.post('/waitlist/partial', { email: form.email, source: 'waitlist_form' }).catch(() => {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.company_name) { setError('Email et nom de société sont requis'); return; }
    if (!rgpd) { setError('Veuillez accepter la politique de confidentialité'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/waitlist', { ...form, source: 'standalone' });
      if (res.data.already_exists) setAlreadyExists(true);
      else setSuccess(true);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(200,200,220,0.5)',
    color: DARK, width: '100%', padding: '11px 14px', borderRadius: 10,
    fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box',
  };

  if (success || alreadyExists) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: success ? 'rgba(34,197,94,0.1)' : 'rgba(156,65,65,0.1)', border: `1px solid ${success ? 'rgba(34,197,94,0.25)' : 'rgba(156,65,65,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle style={{ width: 28, height: 28, color: success ? '#22C55E' : GOLD }} />
        </div>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, color: DARK, marginBottom: 8 }}>
          {success ? "Vous êtes sur la liste !" : "Déjà inscrit !"}
        </h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
          {success
            ? `Inscription enregistrée pour ${form.email}. Notre équipe vous contactera en priorité dès ouverture.`
            : `${form.email} est déjà sur notre liste d'attente — nous vous contacterons bientôt.`}
        </p>
        <a href={`mailto:theo@iralink-agency.com`} style={{ fontFamily: 'monospace', fontSize: 12, color: GOLD, display: 'block', marginBottom: 16 }}>
          theo@iralink-agency.com
        </a>
        <Link to="/" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <div>
          <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 }}>
            Société / Enseigne <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input type="text" value={form.company_name} onChange={e => set('company_name', e.target.value)}
            placeholder="Ma Franchise SAS" required style={inputStyle}
            onFocus={e => e.target.style.border = `1px solid rgba(156,65,65,0.6)`}
            onBlur={e => e.target.style.border = '1px solid rgba(200,200,220,0.5)'} />
        </div>
        <div>
          <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 }}>
            Téléphone <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optionnel)</span>
          </label>
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="+33 6 12 34 56 78" autoComplete="tel" style={inputStyle}
            onFocus={e => e.target.style.border = `1px solid rgba(156,65,65,0.6)`}
            onBlur={e => e.target.style.border = '1px solid rgba(200,200,220,0.5)'} />
        </div>
      </div>

      <div>
        <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 }}>
          Adresse email <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
          placeholder="vous@entreprise.fr" required autoComplete="email" style={inputStyle}
          onFocus={e => e.target.style.border = `1px solid rgba(156,65,65,0.6)`}
          onBlur={e => { e.target.style.border = '1px solid rgba(200,200,220,0.5)'; notifyPartialEmail(); }} />
      </div>

      <div>
        <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 }}>
          Message <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optionnel)</span>
        </label>
        <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={3}
          placeholder="Dites-nous en plus sur votre réseau, vos besoins DIP..."
          style={{ ...inputStyle, resize: 'none' }}
          onFocus={e => e.target.style.border = `1px solid rgba(156,65,65,0.6)`}
          onBlur={e => e.target.style.border = '1px solid rgba(200,200,220,0.5)'} />
      </div>

      {/* RGPD */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={rgpd}
          onChange={e => setRgpd(e.target.checked)}
          style={{ width: 16, height: 16, marginTop: 1, flexShrink: 0, accentColor: GOLD, cursor: 'pointer' }}
        />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
          J&apos;accepte que mes données soient utilisées pour me contacter au sujet de DIPpro.
          Voir notre{' '}
          <Link to="/privacy" style={{ color: GOLD, textDecoration: 'underline' }}>politique de confidentialité</Link>.
        </span>
      </label>

      {error && (
        <div style={{ borderRadius: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontFamily: 'DM Sans, sans-serif', fontSize: 12 }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading || !form.email || !form.company_name || !rgpd}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '13px 24px', borderRadius: 12, border: 'none', cursor: loading || !form.email || !form.company_name || !rgpd ? 'not-allowed' : 'pointer',
          background: form.email && form.company_name && rgpd ? GOLD : 'rgba(156,65,65,0.4)',
          color: DARK, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600,
          boxShadow: form.email && form.company_name && rgpd ? '0 4px 16px rgba(156,65,65,0.35)' : 'none',
          transition: 'all 0.2s',
        }}>
        {loading
          ? <><span style={{ width: 16, height: 16, border: `2px solid ${DARK}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Inscription…</>
          : <><Send style={{ width: 16, height: 16 }} /> M&apos;inscrire sur la liste d&apos;attente</>}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}

/* ─── Page principale ───────────────────────────────────────── */

const MOCKUP_TABS = [
  { label: 'Tableau de bord', component: MockupDashboard },
  { label: 'Générer un DIP', component: MockupGenerate },
  { label: 'Analyse IA', component: MockupAnalysis },
];

export default function WaitlistPage() {
  usePageBackground(BG);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const formRef = useRef(null);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const ActiveMockup = MOCKUP_TABS[activeTab].component;

  return (
    <>
      <SEOHead
        title="Accès anticipé — Liste d'attente"
        description="Inscrivez-vous sur la liste d'attente DIPpro. Accès anticipé Early Adopter, tarif préférentiel garanti à vie (-40%), analyse DIP gratuite (valeur 250€). Pour franchiseurs français."
        canonical="/waitlist"
      />
    <div className="min-h-screen" style={{ background: BG }}>

      {/* ── HEADER ── */}
      <header style={{ background: GLASS, backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(156,65,65,0.18)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 8 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', minWidth: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(156,65,65,0.12)', border: '1px solid rgba(156,65,65,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield style={{ width: 16, height: 16, color: GOLD }} />
            </div>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: 20, color: DARK }}>DIPpro</span>
            <span className="hidden sm:inline" style={{ fontFamily: 'monospace', fontSize: 10, color: '#64748B' }}>by Iralink</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="hidden sm:block" style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(156,65,65,0.1)', border: '1px solid rgba(156,65,65,0.25)' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: GOLD }}>Accès anticipé ouvert</span>
            </div>
            <Link to="/login" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#64748B', textDecoration: 'none' }}>
              Connexion
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 48px', textAlign: 'center' }}>
        <FadeIn>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 20, background: 'rgba(156,65,65,0.1)', border: '1px solid rgba(156,65,65,0.25)', marginBottom: 28 }}>
            <Clock style={{ width: 13, height: 13, color: GOLD }} />
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: GOLD }}>Société en cours de création — Accès anticipé</span>
          </div>

          <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(2.8rem, 7vw, 4.5rem)', color: DARK, lineHeight: 1.1, marginBottom: 20 }}>
            DIPpro arrive.<br />
            <span style={{ color: GOLD }}>Soyez parmi les premiers.</span>
          </h1>

          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 17, color: '#64748B', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 36px' }}>
            L&apos;IA qui analyse, génère et met à jour votre Document d&apos;Information
            Précontractuelle en conformité avec la Loi Doubin — Art. L.330-3 du Code de commerce.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <LiquidGlassBtn
              onClick={scrollToForm}
              padding="16px 32px"
              cornerRadius={14}
              displacementScale={80}
              blurAmount={0.12}
              saturation={160}
              aberrationIntensity={2}
              elasticity={0.25}
              mode="prominent"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>
                <Send style={{ width: 18, height: 18 }} />
                Rejoindre la liste d&apos;attente
              </span>
            </LiquidGlassBtn>

            <LiquidGlassBtn
              onClick={() => navigate('/')}
              padding="14px 24px"
              cornerRadius={14}
              displacementScale={50}
              blurAmount={0.06}
              saturation={130}
              aberrationIntensity={1}
              elasticity={0.18}
              mode="standard"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                <ArrowLeft style={{ width: 16, height: 16 }} />
                Retour au site
              </span>
            </LiquidGlassBtn>
          </div>

          {/* Trust */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 36 }}>
            {['Loi Doubin 1989', 'Art. L.330-3', 'Sous-traitants encadrés RGPD', 'Base de données en Europe'].map(b => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#64748B' }}>
                <CheckCircle style={{ width: 14, height: 14, color: '#22C55E' }} />
                {b}
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ── APP MOCKUP ── */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 72px' }}>
        <FadeIn>
          {/* Tab selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            {MOCKUP_TABS.map((t, i) => (
              <button key={t.label} onClick={() => setActiveTab(i)}
                style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${i === activeTab ? GOLD : 'rgba(200,200,220,0.4)'}`, background: i === activeTab ? 'rgba(156,65,65,0.12)' : 'rgba(255,255,255,0.5)', color: i === activeTab ? GOLD : '#64748B', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: i === activeTab ? 600 : 400, cursor: 'pointer', transition: 'all 0.2s' }}>
                {t.label}
              </button>
            ))}
          </div>
          {/* Mockup */}
          <div style={{ transition: 'opacity 0.3s', opacity: 1 }}>
            <ActiveMockup />
          </div>
          <p style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 10, color: '#94A3B8', marginTop: 12 }}>
            Aperçu réel de l&apos;interface DIPpro — captures générées depuis l&apos;application
          </p>
        </FadeIn>
      </section>

      {/* ── BENEFITS ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 72px' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 36, color: DARK, marginBottom: 12 }}>
              Pourquoi s&apos;inscrire maintenant ?
            </h2>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: '#64748B' }}>
              Les inscrits avant ouverture bénéficient d&apos;avantages exclusifs et permanents.
            </p>
          </div>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {BENEFITS.map(({ icon: Icon, label, desc }, i) => (
            <FadeIn key={label} delay={i * 80}>
              <div style={{ borderRadius: 18, padding: '24px 20px', background: GLASS, backdropFilter: 'blur(20px)', border: '1px solid rgba(156,65,65,0.18)', height: '100%', boxSizing: 'border-box' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(156,65,65,0.1)', border: '1px solid rgba(156,65,65,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon style={{ width: 18, height: 18, color: GOLD }} />
                </div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 6 }}>{label}</p>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>{desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 36, color: DARK, marginBottom: 12 }}>
              Tout pour votre conformité DIP
            </h2>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: '#64748B', maxWidth: 500, margin: '0 auto' }}>
              Analyse fondée sur la grille R.330-1 et la jurisprudence de la Cour de cassation, avec citation systématique de la sous-disposition exacte.
            </p>
          </div>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {FEATURES.map(({ icon: Icon, label, desc }, i) => (
            <FadeIn key={label} delay={i * 60}>
              <div style={{ borderRadius: 14, padding: '18px 20px', background: 'rgba(255,255,255,0.62)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.55)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(156,65,65,0.1)', border: '1px solid rgba(156,65,65,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: 16, height: 16, color: GOLD }} />
                </div>
                <div>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 4 }}>{label}</p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#64748B', lineHeight: 1.55 }}>{desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── FORM ── */}
      <section ref={formRef} style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px 80px' }}>
        <FadeIn>
          <div style={{ borderRadius: 24, padding: '40px 40px', background: GLASS, backdropFilter: 'blur(24px)', border: '1px solid rgba(156,65,65,0.2)', boxShadow: '0 8px 48px rgba(80,90,140,0.12)' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(156,65,65,0.1)', border: '1px solid rgba(156,65,65,0.2)', marginBottom: 14 }}>
                <Star style={{ width: 12, height: 12, color: GOLD }} />
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: GOLD }}>Accès anticipé — places limitées</span>
              </div>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, color: DARK, marginBottom: 8 }}>
                Rejoindre la liste d&apos;attente
              </h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
                DIPpro ouvrira ses accès dès la constitution d&apos;Iralink Agency.
                Inscrivez-vous pour être contacté en priorité, bénéficier du tarif
                préférentiel et de l&apos;onboarding personnalisé.
              </p>
            </div>

            <WaitlistForm />

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(156,65,65,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#94A3B8', textDecoration: 'none' }}>
                <ArrowLeft style={{ width: 12, height: 12 }} /> Retour
              </Link>
              <Link to="/login" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: GOLD, textDecoration: 'none' }}>
                Déjà un compte ? Se connecter
              </Link>
            </div>
          </div>

          {/* Guarantee row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20, marginTop: 20 }}>
            {[['🔒', 'Données confidentielles'], ['🇪🇺', 'Base de données en Europe'], ['✉️', 'Zéro spam']].map(([icon, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#94A3B8' }}>
                <span>{icon}</span> {label}
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(156,65,65,0.15)', background: 'rgba(255,255,255,0.5)', padding: '28px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield style={{ width: 14, height: 14, color: GOLD }} />
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: 16, color: DARK }}>DIPpro</span>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#94A3B8' }}>© {new Date().getFullYear()} Iralink — Société en cours de création</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[['/privacy', 'Confidentialité'], ['/cgu', 'CGU'], ['/mentions-legales', 'Mentions légales']].map(([to, label]) => (
              <Link key={to} to={to} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#64748B', textDecoration: 'none' }}>{label}</Link>
            ))}
            <a href="mailto:theo@iralink-agency.com" style={{ fontFamily: 'monospace', fontSize: 12, color: GOLD, textDecoration: 'none' }}>theo@iralink-agency.com</a>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
