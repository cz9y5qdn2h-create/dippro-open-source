// Pastille flottante transparente indiquant la position de lecture dans un
// document continu (façon Word/Pages) — reste fixe à l'écran, se met à jour
// via useSectionScrollTracking pendant le défilement.
export default function PositionPill({ index, total, label, onClick }) {
  if (!total) return null;
  return (
    <button
      onClick={onClick}
      title="Retour en haut du document"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-xl bg-bg-card/70 border border-gold/25 shadow-lg max-w-[calc(100vw-2rem)] transition-colors hover:border-gold/40"
    >
      <span className="font-dm-mono text-xs text-gold tracking-wide flex-shrink-0">{index + 1} / {total}</span>
      <span className="w-px h-3.5 bg-border-subtle flex-shrink-0" />
      <span className="font-dm-sans text-xs text-text-primary truncate">{label}</span>
    </button>
  );
}
