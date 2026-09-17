import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Send, CheckCircle, ArrowLeft, BookOpen, Gauge, AlertTriangle } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import api from '../lib/api';
import usePageBackground from '../lib/usePageBackground';

const GOLD = '#9C4141';
const DARK = '#1A1826';
const GLASS = 'rgba(255,255,255,0.85)';
const BG = 'linear-gradient(145deg, #dde2f5 0%, #ebe7fa 40%, #dceaf8 70%, #e3e1f6 100%)';

const inputStyle = {
  background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(200,200,220,0.5)',
  color: DARK, width: '100%', padding: '13px 14px', borderRadius: 10,
  fontFamily: 'DM Sans, sans-serif', fontSize: 15, outline: 'none', boxSizing: 'border-box',
};

const labelStyle = { fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 };

// Chaque item est un point de vigilance déjà documenté dans legalLibrary.js
// (r330-2, l330-3, cass-2024-06, cass-previsionnels) — jamais une statistique
// inventée. "non" et "incertain" comptent tous deux comme un point de risque :
// en cas de contentieux, ne pas savoir équivaut à ne pas pouvoir prouver.
const CHECKLIST = [
  {
    id: 'delai',
    q: 'Le DIP a-t-il été remis au moins 20 jours avant la signature (ou tout premier versement) ?',
    note: 'Non-respect du délai : contravention de 5e classe, 1 500 € (3 000 € en récidive).',
    citation: 'Art. R.330-2 C. com.',
  },
  {
    id: 'preuve',
    q: 'Une preuve datée de la remise (accusé de réception signé, email horodaté) est-elle conservée ?',
    note: 'La charge de la preuve de la remise pèse sur le franchiseur, en contentieux comme lors d\'un contrôle.',
    citation: 'Art. R.330-2 C. com.',
  },
  {
    id: 'actualise',
    q: 'Le DIP a-t-il été actualisé au cours des 12 derniers mois (état du réseau, comptes annuels, sorties de réseau) ?',
    note: 'Contenu obligatoire du DIP — un DIP figé expose à une information insincère au jour de la remise.',
    citation: 'Art. R.330-1 C. com.',
  },
  {
    id: 'previsionnel',
    q: 'Si un prévisionnel chiffré est fourni, comporte-t-il un avertissement explicite sur son caractère non garanti ?',
    note: 'Des prévisionnels grossièrement erronés ou non avertis peuvent caractériser un dol.',
    citation: 'Cass. com., 1er déc. 2021, n°18-26.572',
  },
  {
    id: 'fait_nouveau',
    q: 'Tout fait nouveau significatif survenu entre la remise du DIP et la signature (procédure collective, fermetures massives...) est-il signalé au candidat ?',
    note: "L'obligation d'information court jusqu'à la signature, pas seulement jusqu'à la remise du DIP.",
    citation: 'Cass. com., 26 juin 2024, n°23-14.085',
  },
];

const RESSOURCE_TEASERS = [
  { manquement: 'DIP non remis ou hors délai de 20 jours', sanction: 'Amende contraventionnelle (5e classe)', fondement: 'Art. R.330-2 C. com.' },
  { manquement: 'Information déterminante dissimulée intentionnellement', sanction: 'Dol → nullité et/ou dommages-intérêts', fondement: 'Art. 1137 C. civ. ; Cass. com. 26 juin 2024' },
  { manquement: 'Prévisionnels grossièrement erronés', sanction: "Dommages-intérêts ; clauses d'exonération réputées non écrites", fondement: 'Cass. com. 1er déc. 2021, n°18-26.572' },
];

function computeRisk(answers) {
  const flagged = CHECKLIST.filter(item => answers[item.id] === 'non' || answers[item.id] === 'incertain');
  const points = flagged.length;
  let level, color, bg;
  if (points === 0) { level = 'Risque faible'; color = '#22C55E'; bg = 'rgba(34,197,94,0.1)'; }
  else if (points <= 2) { level = 'Risque modéré'; color = GOLD; bg = 'rgba(156,65,65,0.12)'; }
  else { level = 'Risque élevé'; color = '#EF4444'; bg = 'rgba(239,68,68,0.1)'; }
  return { points, level, color, bg, flagged };
}

function AnswerPills({ value, onChange }) {
  const options = [['oui', 'Oui'], ['non', 'Non'], ['incertain', 'Incertain']];
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          style={{
            padding: '7px 14px', borderRadius: 8, fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: value === v ? 600 : 400,
            border: `1px solid ${value === v ? GOLD : 'rgba(200,200,220,0.5)'}`,
            background: value === v ? 'rgba(156,65,65,0.15)' : 'rgba(255,255,255,0.7)',
            color: value === v ? GOLD : '#64748B', cursor: 'pointer', minHeight: 32,
          }}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function LeadsLitigesDIPPage() {
  usePageBackground(BG);
  const [form, setForm] = useState({ nom: '', email: '', telephone: '', structure: '' });
  const [consentement, setConsentement] = useState(false);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };
  const setAnswer = (id, v) => setAnswers(a => ({ ...a, [id]: v }));

  const answeredCount = Object.keys(answers).length;
  const risk = useMemo(() => computeRisk(answers), [answers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom || !form.email || !form.telephone) {
      setError('Nom, email et téléphone sont requis');
      return;
    }
    if (!consentement) {
      setError('Le consentement est requis pour recevoir la ressource');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/leads/litiges-dip', { ...form, consentement });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Recevoir la base des litiges DIP + estimer le risque — Ressource gratuite avocats"
        description="Recevez gratuitement la base des litiges DIP (sanctions, jurisprudence, fondements juridiques classés par manquement) et estimez en 1 minute le niveau de risque du DIP de votre client — pour avocats en droit de la franchise."
        canonical="/ressources/litiges-dip"
      />
      <div className="min-h-screen" style={{ background: BG }}>
        <header style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(156,65,65,0.12)', border: '1px solid rgba(156,65,65,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield style={{ width: 15, height: 15, color: GOLD }} />
            </div>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: 19, color: DARK }}>DIPpro</span>
          </Link>
        </header>

        <main style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 60px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(156,65,65,0.1)', border: '1px solid rgba(156,65,65,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <BookOpen style={{ width: 24, height: 24, color: GOLD }} />
            </div>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 30, color: DARK, lineHeight: 1.2, marginBottom: 10 }}>
              La base des litiges DIP
            </h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 14 }}>
              Sanctions, jurisprudence récente et fondements juridiques classés par manquement à la Loi Doubin, envoyés gratuitement par email — avec, ci-dessous, une estimation immédiate du niveau de risque du DIP de votre client.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', borderRadius: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(156,65,65,0.15)' }}>
              {RESSOURCE_TEASERS.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: GOLD, flexShrink: 0 }}>{t.fondement}</span>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#475569' }}>{t.manquement} — {t.sanction.toLowerCase()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Estimation du risque ── */}
          <div style={{ borderRadius: 20, padding: '24px', background: GLASS, backdropFilter: 'blur(24px)', border: '1px solid rgba(156,65,65,0.2)', boxShadow: '0 8px 40px rgba(80,90,140,0.12)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Gauge style={{ width: 18, height: 18, color: GOLD }} />
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, color: DARK }}>Estimez le risque du DIP de votre client</h2>
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#64748B', lineHeight: 1.55, marginBottom: 16 }}>
              5 points de vigilance parmi les plus fréquemment invoqués en contentieux DIP. Répondez pour obtenir une estimation immédiate — indicative, pas une analyse complète du dossier.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {CHECKLIST.map((item, i) => (
                <div key={item.id}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DARK, marginBottom: 8, lineHeight: 1.45 }}>
                    <span style={{ color: GOLD, fontWeight: 600 }}>{i + 1}.</span> {item.q}
                  </p>
                  <AnswerPills value={answers[item.id]} onChange={v => setAnswer(item.id, v)} />
                </div>
              ))}
            </div>

            {answeredCount === CHECKLIST.length && (
              <div style={{ marginTop: 18, borderRadius: 14, padding: '16px 18px', background: risk.bg, border: `1px solid ${risk.color}33` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: risk.flagged.length ? 10 : 0 }}>
                  <Gauge style={{ width: 16, height: 16, color: risk.color }} />
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700, color: risk.color }}>{risk.level}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748B' }}>{risk.points}/{CHECKLIST.length} point(s) de vigilance</span>
                </div>
                {risk.flagged.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
                    <AlertTriangle style={{ width: 13, height: 13, color: risk.color, flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                      {item.note} <span style={{ fontFamily: 'monospace', fontSize: 10, color: GOLD }}>({item.citation})</span>
                    </p>
                  </div>
                ))}
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#94A3B8', marginTop: 10, lineHeight: 1.5 }}>
                  Indicateur de pré-qualification généré automatiquement à partir de vos réponses — ne constitue pas un conseil juridique au sens de la loi n° 71-1130 du 31 décembre 1971 et ne remplace pas l&apos;examen du dossier.
                </p>
              </div>
            )}
          </div>

          {/* ── Formulaire de contact ── */}
          <div style={{ borderRadius: 20, padding: '28px 24px', background: GLASS, backdropFilter: 'blur(24px)', border: '1px solid rgba(156,65,65,0.2)', boxShadow: '0 8px 40px rgba(80,90,140,0.12)' }}>
            {success ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <CheckCircle style={{ width: 26, height: 26, color: '#22C55E' }} />
                </div>
                <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: DARK, marginBottom: 8 }}>
                  Merci, {form.nom.split(' ')[0]}
                </h2>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 16 }}>
                  La ressource vient de vous être envoyée à {form.email}.
                </p>
                {answeredCount === CHECKLIST.length && (
                  <div style={{ borderRadius: 12, padding: '12px 16px', background: risk.bg, border: `1px solid ${risk.color}33`, marginBottom: 16, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Gauge style={{ width: 15, height: 15, color: risk.color }} />
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 700, color: risk.color }}>Votre résultat : {risk.level}</span>
                    </div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#64748B', marginTop: 6 }}>
                      {risk.points}/{CHECKLIST.length} point(s) de vigilance — détail ci-dessus.
                    </p>
                  </div>
                )}
                <Link to="/ressources/base-litiges-dip" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: GOLD, fontWeight: 600, textDecoration: 'underline' }}>
                  Consulter la ressource maintenant
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nom et prénom <span style={{ color: '#EF4444' }}>*</span></label>
                  <input type="text" value={form.nom} onChange={e => set('nom', e.target.value)}
                    placeholder="Maître Jean Dupont" required autoComplete="name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email professionnel <span style={{ color: '#EF4444' }}>*</span></label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="vous@cabinet-avocat.fr" required autoComplete="email" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Téléphone <span style={{ color: '#EF4444' }}>*</span></label>
                  <input type="tel" value={form.telephone} onChange={e => set('telephone', e.target.value)}
                    placeholder="+33 6 12 34 56 78" required autoComplete="tel" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cabinet / structure <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optionnel)</span></label>
                  <input type="text" value={form.structure} onChange={e => set('structure', e.target.value)}
                    placeholder="Nom du cabinet" autoComplete="organization" style={inputStyle} />
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={consentement} onChange={e => { setConsentement(e.target.checked); setError(''); }}
                    style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: GOLD, cursor: 'pointer' }} />
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#64748B', lineHeight: 1.55 }}>
                    J&apos;accepte que DIPpro (Iralink-Agency) utilise mes coordonnées pour m&apos;envoyer la ressource demandée et me recontacter au sujet de DIPpro. Voir notre{' '}
                    <Link to="/privacy" style={{ color: GOLD, textDecoration: 'underline' }}>politique de confidentialité</Link>.
                    Je peux me désinscrire à tout moment.
                  </span>
                </label>

                {error && (
                  <div style={{ borderRadius: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontFamily: 'DM Sans, sans-serif', fontSize: 12 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px 24px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    background: GOLD, color: DARK, fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600,
                    boxShadow: '0 4px 16px rgba(156,65,65,0.35)', minHeight: 48,
                  }}>
                  {loading
                    ? <><span style={{ width: 16, height: 16, border: `2px solid ${DARK}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Envoi…</>
                    : <><Send style={{ width: 16, height: 16 }} /> Recevoir la ressource{answeredCount === CHECKLIST.length ? ' + mon résultat' : ''}</>}
                </button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </form>
            )}
          </div>

          <p style={{ textAlign: 'center', marginTop: 20 }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#94A3B8', textDecoration: 'none' }}>
              <ArrowLeft style={{ width: 12, height: 12 }} /> Retour à l&apos;accueil
            </Link>
          </p>
        </main>
      </div>
    </>
  );
}
