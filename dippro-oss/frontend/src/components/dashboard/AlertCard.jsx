import StatusBadge from '../ui/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AlertCard({ alert, compact = false }) {
  const timeAgo = alert.created_at
    ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: fr })
    : '';

  if (compact) {
    return (
      <div className="p-3 rounded bg-bg-elevated border border-border-subtle hover:border-border-default transition-colors">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-dm-sans text-xs text-text-primary line-clamp-2 flex-1">
            {alert.dip_sections?.section_title || 'Section inconnue'}
          </p>
          <StatusBadge status={alert.urgency || 'moyenne'} />
        </div>
        <p className="font-dm-mono text-xs text-text-secondary">{timeAgo}</p>
      </div>
    );
  }

  return (
    <div className="card border-border-default">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-dm-sans text-sm font-medium text-text-primary">
            {alert.dip_sections?.section_title || 'Section inconnue'}
          </h3>
          <p className="font-dm-mono text-xs text-text-secondary mt-0.5">{timeAgo} • {alert.source}</p>
        </div>
        <StatusBadge status={alert.urgency || 'moyenne'} />
      </div>

      {alert.old_value && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-danger/5 border border-danger/20 rounded p-3">
            <p className="font-dm-mono text-xs text-danger mb-1">Ancienne valeur</p>
            <p className="font-dm-sans text-xs text-text-primary line-clamp-3">{alert.old_value}</p>
          </div>
          <div className="bg-success/5 border border-success/20 rounded p-3">
            <p className="font-dm-mono text-xs text-success mb-1">Nouvelle valeur</p>
            <p className="font-dm-sans text-xs text-text-primary line-clamp-3">{alert.new_value}</p>
          </div>
        </div>
      )}

      {alert.suggestion && (
        <div className="bg-gold/5 border border-gold/20 rounded p-3">
          <p className="font-dm-mono text-xs text-gold mb-1">Suggestion IA</p>
          <p className="font-dm-sans text-xs text-text-primary">{alert.suggestion}</p>
        </div>
      )}
    </div>
  );
}
