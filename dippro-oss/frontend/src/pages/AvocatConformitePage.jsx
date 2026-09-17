import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import AvocatClientShell from '../components/avocat/AvocatClientShell';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ShieldCheck, AlertTriangle, Clock, Users, Newspaper, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { COMPLIANCE_LEVEL_LABEL, SCORE_DISCLAIMER } from '../lib/legalCopy';

const COMPLIANCE_LABEL = COMPLIANCE_LEVEL_LABEL;

function Stat({ icon: Icon, label, value, alert }) {
  return (
    <div className="card-v2">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4" style={{ color: alert ? 'rgb(241 124 124)' : 'var(--v2-gold)' }} />
      </div>
      <p className="display-v2" style={{ fontSize: 28, color: alert ? 'rgb(241 124 124)' : undefined }}>{value}</p>
      <p className="font-dm-sans text-xs mt-1" style={{ color: 'rgb(var(--text-secondary))' }}>{label}</p>
    </div>
  );
}

export default function AvocatConformitePage() {
  const { franchiseurId } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['compliance-overview', franchiseurId],
    queryFn: () => api.get(`/compliance/overview?franchiseur_id=${franchiseurId}`).then(r => r.data),
  });

  const dip = data?.dip;
  const alerts = data?.alerts || { total: 0, items: [] };
  const signatureDelays = data?.signature_delays || { count: 0, items: [] };
  const reprises = data?.reprises || { count: 0, items: [] };
  const news = data?.regulatory_news || [];

  return (
    <AvocatClientShell franchiseurId={franchiseurId} active="conformite">
      <div className="space-y-6 animate-fade-in">
        <div>
          <p className="mono-label-v2">Vue d'ensemble</p>
          <p className="display-v2" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>Conformité DIP</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : (
          <>
            {dip && (
              <div className="card-v2">
                <p className="font-dm-sans text-sm mb-1" style={{ color: 'rgb(var(--text-primary))' }}>
                  {COMPLIANCE_LABEL[dip.compliance_level] || 'Non évalué'}
                </p>
                <p className="font-dm-mono text-xs" style={{ color: 'var(--v2-gold)' }}>Score {dip.conformity_score ?? 0}%</p>
                <p className="font-dm-sans text-xs mt-2 italic" style={{ color: 'rgb(var(--text-muted))' }}>{SCORE_DISCLAIMER}</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat icon={Bell} label="Alertes en attente" value={alerts.total} alert={alerts.total > 0} />
              <Stat icon={Clock} label="Délai 20j non respecté" value={signatureDelays.count} alert={signatureDelays.count > 0} />
              <Stat icon={Users} label="Reprises en cours" value={reprises.count} />
              <Stat icon={Newspaper} label="Actu. fort impact" value={news.length} />
            </div>

            {alerts.items.length > 0 && (
              <div className="card-v2">
                <p className="font-dm-sans text-sm mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--text-primary))' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(241 124 124)' }} /> Alertes prioritaires
                </p>
                <div className="space-y-2">
                  {alerts.items.slice(0, 8).map(a => (
                    <div key={a.id} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'var(--v2-surface)' }}>
                      <div className="min-w-0">
                        <p className="font-dm-sans text-sm truncate" style={{ color: 'rgb(var(--text-primary))' }}>{a.title || a.source}</p>
                        {a.suggestion && <p className="font-dm-sans text-xs mt-0.5 line-clamp-1" style={{ color: 'rgb(var(--text-secondary))' }}>{a.suggestion}</p>}
                      </div>
                      <span className="font-dm-mono text-xs flex-shrink-0" style={{ color: a.urgency === 'haute' ? 'rgb(241 124 124)' : 'var(--v2-gold)' }}>{a.urgency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {signatureDelays.items.length > 0 && (
              <div className="card-v2">
                <p className="font-dm-sans text-sm mb-3" style={{ color: 'rgb(var(--text-primary))' }}>Délai légal — candidats en cours</p>
                <div className="space-y-2">
                  {signatureDelays.items.map(f => (
                    <div key={f.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'var(--v2-surface)' }}>
                      <span className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{f.name}</span>
                      <span className="font-dm-mono text-xs" style={{ color: f.signature_delay.compliant ? 'rgb(91 216 154)' : 'rgb(241 124 124)' }}>
                        {f.signature_delay.days_between}j {f.signature_delay.compliant ? '— OK' : '— insuffisant'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {news.length > 0 && (
              <div className="card-v2">
                <p className="font-dm-sans text-sm mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--text-primary))' }}>
                  <Newspaper className="w-4 h-4" style={{ color: 'var(--v2-gold)' }} /> Veille à fort impact
                </p>
                <div className="space-y-2">
                  {news.map(n => (
                    <a key={n.id} href={n.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'var(--v2-surface)' }}>
                      <div className="min-w-0">
                        <p className="font-dm-sans text-sm truncate" style={{ color: 'rgb(var(--text-primary))' }}>{n.title}</p>
                        <p className="font-dm-mono text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                          {n.source} {n.published_at && '· ' + formatDistanceToNow(new Date(n.published_at), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {alerts.total === 0 && signatureDelays.count === 0 && news.length === 0 && (
              <div className="card-v2 text-center py-16">
                <ShieldCheck className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgb(91 216 154)' }} />
                <p className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>Aucun signal de non-conformité actif pour ce client.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AvocatClientShell>
  );
}
