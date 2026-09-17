// Même palette sémantique que ConformityGauge (vert/ambre/rouge réservés à
// l'état, l'accent seal-red reste pour l'identité) — les deux widgets de la
// ligne 1 du dashboard doivent raconter la même échelle de couleur.
const BARS = [
  { key: 'conforme',    label: 'Conformes',     color: '#34B27B', text: 'rgb(91 216 154)' },
  { key: 'a_verifier',  label: 'À vérifier',    color: '#D89C3A', text: 'rgb(224 176 82)' },
  { key: 'non_conforme', label: 'Non conformes', color: '#D65454', text: 'rgb(241 124 124)' },
];

const CHART_HEIGHT = 88;

export default function SectionsBarChart({ total = 0, conforme = 0, a_verifier = 0, non_conforme = 0 }) {
  const values = { conforme, a_verifier, non_conforme };
  const max = Math.max(1, conforme, a_verifier, non_conforme);

  return (
    <div className="card h-full flex flex-col" style={{ padding: '18px 22px' }}>
      <div className="flex items-baseline justify-between mb-5">
        <p className="lg-metric-label" style={{ marginBottom: 0 }}>Répartition des sections</p>
        <span className="font-dm-mono text-xs text-text-muted">{total} au total</span>
      </div>

      <div className="flex items-end justify-around gap-6 flex-1" style={{ height: CHART_HEIGHT }}>
        {BARS.map(bar => {
          const value = values[bar.key];
          const height = Math.max(3, Math.round((value / max) * CHART_HEIGHT));
          return (
            <div key={bar.key} className="flex flex-col items-center justify-end h-full flex-1">
              <span className="font-dm-mono text-xs mb-1.5" style={{ color: bar.text }}>{value}</span>
              <div
                style={{
                  width: '100%',
                  maxWidth: 44,
                  height,
                  background: bar.color,
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.5s cubic-bezier(0.16,1,0.3,1)',
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-start justify-around gap-6 mt-3 pt-3" style={{ borderTop: '1px solid rgb(var(--border-default))' }}>
        {BARS.map(bar => (
          <p key={bar.key} className="font-dm-sans text-[11px] text-text-secondary text-center flex-1" style={{ lineHeight: 1.3 }}>
            {bar.label}
          </p>
        ))}
      </div>
    </div>
  );
}
