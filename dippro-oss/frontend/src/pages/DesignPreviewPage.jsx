import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, Upload, ArrowRight, AlertTriangle, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const DEMO_SECTIONS = [
  { id: 1, num: 1, title: 'Présentation du franchiseur', status: 'conforme' },
  { id: 2, num: 2, title: 'Historique du réseau', status: 'conforme' },
  { id: 3, num: 3, title: 'État du réseau de franchise', status: 'a_verifier' },
  { id: 4, num: 4, title: 'Comptes annuels', status: 'non_conforme' },
  { id: 5, num: 5, title: 'Marque et propriété intellectuelle', status: 'conforme' },
];

const STATUS_LABEL = { conforme: 'Conforme', a_verifier: 'À vérifier', non_conforme: 'Non conforme' };
const SCORE_LEVEL = (s) => s >= 80 ? 'high' : s >= 50 ? 'mid' : 'low';

export default function DesignPreviewPage() {
  const [expanded, setExpanded] = useState(null);
  const score = 72;

  return (
    <div className="space-y-16 animate-fade-in max-w-4xl">

      {/* Header */}
      <div>
        <span className="mono-label-v2">Design V2 — Preview</span>
        <h1 className="display-v2 mt-2">
          DIPpro × Whop<br />Composants clés
        </h1>
        <p className="font-dm-sans text-sm text-text-secondary mt-4 max-w-xl leading-relaxed">
          3 composants redessinés avec l'esthétique hybride — fort contraste, typographie grand corps,
          rouge cachet <code style={{ color: 'var(--v2-gold)', fontSize: 12 }}>#9C4141</code>, micro-animations.
          Validez ce design avant application globale.
        </p>
      </div>

      <hr className="border-border-subtle" />

      {/* ── Composant 1 — Score Badge ── */}
      <section className="space-y-6">
        <div>
          <span className="mono-label-v2">Composant 1</span>
          <h2 className="font-cormorant text-3xl text-text-primary mt-1">Score de conformité</h2>
          <p className="font-dm-sans text-sm text-text-secondary mt-1">
            Grand chiffre color-coded avec halo animé. Remplace la jauge circulaire actuelle.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[{ score: 87, label: '≥ 80% · Conforme' }, { score: 62, label: '50–79% · À améliorer' }, { score: 31, label: '< 50% · Critique' }].map(({ score: s, label }) => (
            <div key={s} className="card-v2 flex flex-col items-center py-8 gap-3">
              <div className="score-badge-v2-wrap" data-level={SCORE_LEVEL(s)}>
                <div className="score-badge-v2" data-level={SCORE_LEVEL(s)}>
                  <span className="v2-num">{s}</span>
                  <span className="v2-pct">%</span>
                </div>
              </div>
              <p className="font-dm-sans text-xs text-text-muted">{label}</p>
            </div>
          ))}
        </div>

        <div className="card p-4 flex items-center gap-4">
          <span className="font-dm-mono text-xs text-text-muted">Actuel →</span>
          <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gold" style={{ width: `${score}%` }} />
          </div>
          <span className="font-dm-mono text-xs text-gold">{score}%</span>
        </div>
      </section>

      <hr className="border-border-subtle" />

      {/* ── Composant 2 — Section Conformity Card ── */}
      <section className="space-y-6">
        <div>
          <span className="mono-label-v2">Composant 2</span>
          <h2 className="font-cormorant text-3xl text-text-primary mt-1">Section conformity card</h2>
          <p className="font-dm-sans text-sm text-text-secondary mt-1">
            Bord gauche coloré statut, icône section number en monospace, hover avec décalage X.
          </p>
        </div>

        <div className="space-y-2">
          {DEMO_SECTIONS.map(s => {
            const isOpen = expanded === s.id;
            return (
              <div
                key={s.id}
                className="section-card-v2"
                data-status={s.status}
              >
                <button
                  className="w-full flex items-center justify-between gap-3"
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-dm-mono text-xs w-5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.20)' }}>
                      {String(s.num).padStart(2, '0')}
                    </span>
                    <span className="font-dm-sans text-sm font-medium text-text-primary truncate">
                      {s.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="section-card-v2-label" data-status={s.status}>
                      {STATUS_LABEL[s.status]}
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </div>
                </button>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4 pl-9"
                  >
                    <p className="font-dm-sans text-sm text-text-secondary leading-relaxed">
                      Contenu de la section — Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                      Raison sociale, forme juridique, capital, dirigeants, numéro RCS.
                    </p>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        <div className="card p-4">
          <p className="font-dm-mono text-xs text-text-muted mb-3">Actuel →</p>
          <div className="space-y-2">
            {DEMO_SECTIONS.slice(0, 3).map(s => (
              <div key={s.id} className="lg-row justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-dm-mono text-xs w-6 flex-shrink-0 text-gold/50">{s.num}</span>
                  <span className="font-dm-sans text-sm text-text-primary truncate">{s.title}</span>
                </div>
                <span className={`badge ${s.status === 'conforme' ? 'badge-conforme' : s.status === 'a_verifier' ? 'badge-a_verifier' : 'badge-non_conforme'}`}>
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="border-border-subtle" />

      {/* ── Composant 3 — CTA Gold Glow ── */}
      <section className="space-y-6">
        <div>
          <span className="mono-label-v2">Composant 3</span>
          <h2 className="font-cormorant text-3xl text-text-primary mt-1">Bouton CTA principal</h2>
          <p className="font-dm-sans text-sm text-text-secondary mt-1">
            Gradient or saturé, halo pulsé au hover, spring animation. Remplace <code className="text-gold/80 text-xs">btn-liquid-glass-prominent</code>.
          </p>
        </div>

        <div className="card-v2 flex flex-col sm:flex-row items-center gap-6 py-8 px-8">
          <div className="flex flex-col items-center gap-3">
            <span className="font-dm-mono text-xs text-text-muted">V2 — Glow</span>
            <button className="btn-cta-glow">
              <Sparkles className="w-4 h-4" />
              Générer les corrections IA
            </button>
            <button className="btn-cta-glow">
              <Upload className="w-4 h-4" />
              Importer un DIP
            </button>
            <button className="btn-cta-glow" style={{ opacity: 0.45, cursor: 'not-allowed' }}>
              État désactivé
            </button>
          </div>

          <div className="w-px h-32 bg-border-subtle hidden sm:block" />

          <div className="flex flex-col items-center gap-3">
            <span className="font-dm-mono text-xs text-text-muted">Actuel — Liquid Glass</span>
            <button className="btn-liquid-glass-prominent flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Générer les corrections IA
            </button>
            <button className="btn-liquid-glass flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Importer un DIP
            </button>
            <button className="btn-primary flex items-center gap-2">
              Bouton primaire <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <hr className="border-border-subtle" />

      {/* ── Carte complète exemple ── */}
      <section className="space-y-6">
        <div>
          <span className="mono-label-v2">Combinaison</span>
          <h2 className="font-cormorant text-3xl text-text-primary mt-1">Bloc Dashboard complet</h2>
          <p className="font-dm-sans text-sm text-text-secondary mt-1">
            Les 3 composants assemblés tel qu'ils apparaîtraient dans le dashboard.
          </p>
        </div>

        <div className="card-v2 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="mono-label-v2">Réseau Dupont Franchise</span>
              <p className="display-v2 text-3xl mt-1">Mon DIP</p>
            </div>
            <button className="btn-cta-glow text-sm py-2.5 px-5">
              <Sparkles className="w-3.5 h-3.5" />
              Corrections IA
            </button>
          </div>

          {/* Score + sections */}
          <div className="grid grid-cols-3 gap-4 items-start">
            <div className="flex flex-col items-center gap-2">
              <div className="score-badge-v2-wrap" data-level={SCORE_LEVEL(score)}>
                <div className="score-badge-v2" data-level={SCORE_LEVEL(score)}>
                  <span className="v2-num">{score}</span>
                  <span className="v2-pct">%</span>
                </div>
              </div>
              <span className="font-dm-sans text-xs text-text-muted">Score global</span>
            </div>

            <div className="col-span-2 space-y-2">
              {DEMO_SECTIONS.slice(0, 3).map(s => (
                <div key={s.id} className="section-card-v2 py-2.5" data-status={s.status}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-dm-mono text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
                        {String(s.num).padStart(2, '0')}
                      </span>
                      <span className="font-dm-sans text-xs font-medium text-text-primary truncate">{s.title}</span>
                    </div>
                    <span className="section-card-v2-label flex-shrink-0" data-status={s.status}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-2 border-t border-border-subtle flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-success/60" />
            <span className="font-dm-mono text-xs text-text-muted">Mis à jour il y a 3 heures · SHA-256 certifié</span>
          </div>
        </div>
      </section>

      <div className="pb-8">
        <p className="font-dm-sans text-xs text-text-muted">
          Ce design est disponible à <code className="text-gold/80">/design-preview</code>.
          Désactiver via <code className="text-gold/80">VITE_FEATURE_DESIGN_PREVIEW=false</code>.
        </p>
      </div>
    </div>
  );
}
