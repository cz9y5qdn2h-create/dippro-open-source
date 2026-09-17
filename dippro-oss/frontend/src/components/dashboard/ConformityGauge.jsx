import { useEffect, useState, useId } from 'react';

// Palette sémantique : la couleur porte le sens (vert conforme / ambre en
// cours / rouge attention), l'or de la charte reste réservé à l'identité et
// aux accents d'interface. Un indicateur entièrement doré n'exprimait aucune
// gradation — on ne pouvait pas lire l'état d'un coup d'œil.
const LEVELS = [
  { min: 80, label: 'Conforme',  from: '#5BD89A', to: '#34B27B', text: 'rgb(91 216 154)' },
  { min: 50, label: 'En cours',  from: '#F0C46A', to: '#D89C3A', text: 'rgb(224 176 82)' },
  { min: 0,  label: 'Attention', from: '#F17C7C', to: '#D65454', text: 'rgb(241 124 124)' },
];

export default function ConformityGauge({ score = 0 }) {
  const gradientId = useId();
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const level = LEVELS.find(l => value >= l.min) || LEVELS[LEVELS.length - 1];

  // L'arc et le nombre montent ensemble depuis zéro : la progression rend la
  // valeur perceptible, pas seulement lisible.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setShown(value); return; }
    let frame;
    const start = performance.now();
    const DURATION = 900;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  // Arc ouvert de 270° (style jauge, plus lisible qu'un cercle fermé) :
  // le vide en bas donne un point de départ et une fin identifiables.
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const ARC = CIRC * 0.75;
  const offset = ARC - (shown / 100) * ARC;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-36 h-36" viewBox="0 0 120 120" style={{ transform: 'rotate(135deg)' }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={level.from} />
            <stop offset="100%" stopColor={level.to} />
          </linearGradient>
        </defs>

        <circle
          cx="60" cy="60" r={R}
          fill="none"
          stroke="rgb(var(--text-muted) / 0.16)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${ARC} ${CIRC}`}
        />
        <circle
          cx="60" cy="60" r={R}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${ARC} ${CIRC}`}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-cormorant font-light leading-none" style={{ fontSize: 40, color: level.text }}>
          {shown}
          <span style={{ fontSize: 20, opacity: 0.6 }}>%</span>
        </span>
        <span className="font-dm-mono text-xs mt-1.5" style={{ color: level.text, opacity: 0.85 }}>
          {level.label}
        </span>
      </div>
    </div>
  );
}
