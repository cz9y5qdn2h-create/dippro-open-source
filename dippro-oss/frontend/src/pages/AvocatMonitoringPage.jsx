import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import AvocatClientShell from '../components/avocat/AvocatClientShell';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Globe, AlertTriangle, CheckCircle, ExternalLink, Newspaper } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AvocatMonitoringPage() {
  const { franchiseurId } = useParams();

  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ['avocat-monitoring-sources', franchiseurId],
    queryFn: () => api.get(`/monitoring/sources?franchiseur_id=${franchiseurId}`).then(r => r.data),
  });

  const { data: news, isLoading: newsLoading } = useQuery({
    queryKey: ['monitoring-news'],
    queryFn: () => api.get('/monitoring/news').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <AvocatClientShell franchiseurId={franchiseurId} active="surveillance">
      <div className="space-y-6 animate-fade-in">
        <div>
          <p className="mono-label-v2">Veille documentaire</p>
          <p className="display-v2" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>Surveillance</p>
        </div>

        <div className="card-v2">
          <p className="font-dm-sans text-sm mb-4" style={{ color: 'rgb(var(--text-primary))' }}>Sources suivies par le franchiseur</p>
          {sourcesLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : !sources?.length ? (
            <p className="font-dm-sans text-sm text-center py-6" style={{ color: 'rgb(var(--text-secondary))' }}>
              Aucune source de veille configurée pour ce client.
            </p>
          ) : (
            <div className="space-y-2">
              {sources.map(source => {
                const lastResult = source.monitoring_results?.[0];
                return (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors"
                    style={{ background: 'var(--v2-surface)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Globe className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--v2-gold)' }} />
                      <div className="min-w-0">
                        <p className="font-dm-sans text-sm truncate" style={{ color: 'rgb(var(--text-primary))' }}>{source.name}</p>
                        {lastResult && (
                          <p className="font-dm-mono text-xs truncate" style={{ color: 'rgb(var(--text-muted))' }}>
                            {formatDistanceToNow(new Date(lastResult.checked_at), { addSuffix: true, locale: fr })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lastResult?.change_detected ? (
                        <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(241 124 124)' }} />
                      ) : (
                        <CheckCircle className="w-4 h-4" style={{ color: 'rgb(91 216 154)' }} />
                      )}
                      <ExternalLink className="w-3.5 h-3.5" style={{ color: 'rgb(var(--text-muted))' }} />
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="card-v2">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="w-4 h-4" style={{ color: 'var(--v2-gold)' }} />
            <p className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-primary))' }}>Actualités franchise & juridique</p>
          </div>
          {newsLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : !news?.items?.length ? (
            <p className="font-dm-sans text-sm text-center py-6" style={{ color: 'rgb(var(--text-secondary))' }}>
              Aucun article récupéré pour le moment.
            </p>
          ) : (
            <div className="space-y-1">
              {news.items.slice(0, 15).map(item => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start justify-between gap-3 px-2 py-2.5 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-dm-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{item.source}</p>
                      {item.impact_level && item.impact_level !== 'none' && (
                        <span
                          className="font-dm-mono text-xs px-2 py-0.5 rounded-full"
                          style={{
                            color: item.impact_level === 'critical' || item.impact_level === 'high' ? 'rgb(241 124 124)' : 'var(--v2-gold)',
                            border: `1px solid ${item.impact_level === 'critical' || item.impact_level === 'high' ? 'rgba(241,124,124,0.35)' : 'var(--v2-border-hot)'}`,
                          }}
                        >
                          {item.impact_level === 'critical' ? 'Critique' : item.impact_level === 'high' ? 'Élevé' : item.impact_level === 'medium' ? 'Modéré' : 'Faible'}
                        </span>
                      )}
                    </div>
                    <p className="font-dm-sans text-sm truncate" style={{ color: 'rgb(var(--text-primary))' }}>{item.title}</p>
                    {item.summary && (
                      <p className="font-dm-sans text-xs mt-0.5 line-clamp-2" style={{ color: 'rgb(var(--text-secondary))' }}>{item.summary}</p>
                    )}
                    {item.impact_reason && (
                      <p className="font-dm-sans text-xs mt-1" style={{ color: 'var(--v2-gold)' }}>{item.impact_reason}</p>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--text-muted))' }} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </AvocatClientShell>
  );
}
