const configs = {
  // DIP sections
  conforme:     { label: 'Conforme',     cls: 'badge bg-success/10 text-success border border-success/20' },
  a_verifier:   { label: 'À vérifier',   cls: 'badge bg-warning/10 text-warning border border-warning/20' },
  non_conforme: { label: 'Non conforme', cls: 'badge bg-danger/10 text-danger border border-danger/20' },
  // Alerts
  pending:      { label: 'En attente',   cls: 'badge bg-warning/10 text-warning border border-warning/20' },
  validated:    { label: 'Validée',      cls: 'badge bg-success/10 text-success border border-success/20' },
  ignored:      { label: 'Ignorée',      cls: 'badge bg-bg-elevated text-text-secondary border border-border-subtle' },
  // Urgency
  haute:        { label: 'Critique',     cls: 'badge bg-danger/10 text-danger border border-danger/20' },
  moyenne:      { label: 'Modérée',      cls: 'badge bg-warning/10 text-warning border border-warning/20' },
  faible:       { label: 'Faible',       cls: 'badge bg-bg-elevated text-text-secondary border border-border-subtle' },
  // Franchisees
  actif:        { label: 'Actif',        cls: 'badge bg-success/10 text-success border border-success/20' },
  inactif:      { label: 'Inactif',      cls: 'badge bg-bg-elevated text-text-secondary border border-border-subtle' },
  en_cours:     { label: 'En cours',     cls: 'badge bg-warning/10 text-warning border border-warning/20' },
  // DIP versions
  brouillon:    { label: 'Brouillon',    cls: 'badge bg-warning/10 text-warning border border-warning/20' },
  archive:      { label: 'Archivé',      cls: 'badge bg-bg-elevated text-text-secondary border border-border-subtle' },
  // Changes
  approved:     { label: 'Approuvé',     cls: 'badge bg-success/10 text-success border border-success/20' },
  rejected:     { label: 'Rejeté',       cls: 'badge bg-danger/10 text-danger border border-danger/20' },
  // Impact
  High:         { label: 'Critique',     cls: 'badge bg-danger/10 text-danger border border-danger/20' },
  Moderate:     { label: 'Modéré',       cls: 'badge bg-warning/10 text-warning border border-warning/20' },
  Low:          { label: 'Faible',       cls: 'badge bg-bg-elevated text-text-secondary border border-border-subtle' },
};

export default function StatusBadge({ status }) {
  const cfg = configs[status] || {
    label: status || '—',
    cls: 'badge bg-bg-elevated text-text-secondary border border-border-subtle'
  };
  return <span className={cfg.cls}>{cfg.label}</span>;
}
