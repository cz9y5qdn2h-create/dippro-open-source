/**
 * Bouton « liquid glass » en CSS pur.
 * Remplace l'ancien wrapper basé sur liquid-glass-react (qui exige React >= 19
 * et plante au runtime sous React 18). Mêmes props pour rester compatible avec
 * tous les appels existants — les props propres au displacement WebGL sont
 * acceptées mais ignorées.
 */
export default function LiquidGlassBtn({
  children,
  onClick,
  padding = '14px 28px',
  cornerRadius = 14,
  className = '',
  style = {},
  type = 'button',
  // props héritées de liquid-glass-react, ignorées volontairement
  displacementScale,
  blurAmount,
  saturation,
  aberrationIntensity,
  elasticity,
  mode,
  overLight,
  ...rest
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`btn-liquid-glass-prominent ${className}`}
      style={{ padding, borderRadius: cornerRadius, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
