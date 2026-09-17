import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, Clock, TrendingUp, Users, BarChart2, Calendar } from 'lucide-react';
import api from '../lib/api';

function fmtTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatCard({ icon: Icon, label, value, sub, color = '#9C4141' }) {
  return (
    <div className="card p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="font-dm-sans text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>{label}</span>
      </div>
      <p className="font-cormorant text-3xl font-light" style={{ color: 'rgb(var(--text-primary))' }}>{value}</p>
      {sub && <p className="font-dm-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{sub}</p>}
    </div>
  );
}

function SectionBar({ section, maxTime }) {
  const pct = maxTime > 0 ? (section.avg_time_s / maxTime) * 100 : 0;
  const openRate = section.open_rate_pct;
  const barColor = openRate >= 70 ? '#22C55E' : openRate >= 40 ? '#9C4141' : openRate > 0 ? '#EF4444' : '#334155';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
      <span className="font-dm-mono text-xs w-5 flex-shrink-0" style={{ color: '#9C4141' }}>
        {String(section.section_number).padStart(2, '0')}
      </span>
      <span className="font-dm-sans text-xs truncate flex-1" style={{ color: 'rgb(var(--text-secondary))', minWidth: 0 }}>
        {section.section_title}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Barre temps */}
        <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
        </div>
        <span className="font-dm-mono text-xs w-10 text-right" style={{ color: 'rgb(var(--text-muted))' }}>
          {section.avg_time_s > 0 ? fmtTime(section.avg_time_s) : '—'}
        </span>
        <span className="font-dm-mono text-xs w-9 text-right" style={{ color: barColor }}>
          {openRate > 0 ? `${openRate}%` : '—'}
        </span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { dipId } = useParams();
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', dipId],
    queryFn: () => api.get(`/analytics/dip/${dipId}`).then(r => r.data),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgb(var(--gold))' }} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-3xl mx-auto py-10 text-center">
        <p className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>Analytics introuvables pour ce DIP.</p>
        <Link to="/dip" className="btn-ghost mt-4 inline-block text-sm">← Retour au DIP</Link>
      </div>
    );
  }

  const { dip_title, total_visits, avg_time_total_s, last_visit_at, sections, visits } = data;
  const maxTime = sections ? Math.max(...sections.map(s => s.avg_time_s), 1) : 1;
  const mostRead = sections?.reduce((best, s) => s.open_rate_pct > (best?.open_rate_pct ?? -1) ? s : best, null);
  const leastRead = sections?.reduce((worst, s) => s.open_rate_pct < (worst?.open_rate_pct ?? 101) ? s : worst, null);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/dip" className="btn-ghost p-2 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-cormorant text-2xl" style={{ color: 'rgb(var(--text-primary))' }}>
            {t('analytics.title')}
          </h1>
          <p className="font-dm-sans text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            {dip_title}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users}     label={t('analytics.stats.visits')}        value={total_visits}                                  sub="candidats uniques"        color="#9C4141" />
        <StatCard icon={Clock}     label={t('analytics.stats.avgTime')}    value={total_visits > 0 ? fmtTime(avg_time_total_s) : '—'} sub="par visite"         color="#818CF8" />
        <StatCard icon={Calendar}  label={t('analytics.stats.lastVisit')} value={last_visit_at ? fmtDate(last_visit_at).split(' à')[0] : '—'} sub={last_visit_at ? fmtDate(last_visit_at).split(' à')[1] ?? '' : 'Aucune visite'} color="#34D399" />
        <StatCard icon={TrendingUp} label={t('analytics.stats.topSection')}  value={total_visits > 0 && mostRead ? `§${mostRead.section_number}` : '—'} sub={total_visits > 0 && mostRead ? mostRead.section_title : 'Aucune donnée'} color="#F59E0B" />
      </div>

      {total_visits === 0 ? (
        <div className="card p-12 text-center">
          <BarChart2 className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--border-default)' }} />
          <h2 className="font-cormorant text-xl mb-2" style={{ color: 'rgb(var(--text-primary))' }}>
            {t('analytics.empty.title')}
          </h2>
          <p className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
            {t('analytics.empty.desc')}
          </p>
          <Link to="/dip" className="btn-primary mt-6 inline-block text-sm">
            {t('analytics.generateLink')}
          </Link>
        </div>
      ) : (
        <>
          {/* Heatmap sections */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cormorant text-lg" style={{ color: 'rgb(var(--text-primary))' }}>
                {t('analytics.engagementTitle')}
              </h2>
              <div className="flex items-center gap-4 font-dm-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                <span>temps moy.</span>
                <span>taux ouv.</span>
              </div>
            </div>
            <div>
              {sections.map(s => (
                <SectionBar key={s.section_number} section={s} maxTime={maxTime} />
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 font-dm-sans text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#22C55E' }} /> {t('analytics.legend.high')}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#9C4141' }} /> {t('analytics.legend.medium')}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#EF4444' }} /> {t('analytics.legend.low')}</span>
            </div>
          </div>

          {/* Insight commercial */}
          {mostRead && leastRead && mostRead.section_number !== leastRead.section_number && (
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(156,65,65,0.06)', border: '1px solid rgba(156,65,65,0.2)' }}>
              <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#9C4141' }} />
              <div className="font-dm-sans text-xs leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>
                <strong style={{ color: 'rgb(var(--text-primary))' }}>Insight commercial :</strong>{' '}
                Les candidats passent le plus de temps sur <strong style={{ color: '#9C4141' }}>«&nbsp;{mostRead.section_title}&nbsp;»</strong> (§{mostRead.section_number})
                {mostRead.avg_time_s > 0 && ` — ${fmtTime(mostRead.avg_time_s)} en moyenne`}.
                {leastRead.open_rate_pct < 30 && (
                  <> La section <strong>«&nbsp;{leastRead.section_title}&nbsp;»</strong> (§{leastRead.section_number}) est peu consultée ({leastRead.open_rate_pct}%) — envisagez de la mettre en avant lors de votre relance.</>
                )}
              </div>
            </div>
          )}

          {/* Liste des visites */}
          <div className="card p-5">
            <h2 className="font-cormorant text-lg mb-4" style={{ color: 'rgb(var(--text-primary))' }}>
              {t('analytics.visitsHistory')} ({visits.length})
            </h2>
            <div className="space-y-2">
              {visits.map((v, i) => (
                <div key={v.visit_id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'rgb(var(--bg-elevated))' }}>
                  <span className="font-dm-mono text-xs w-5 flex-shrink-0" style={{ color: 'rgb(var(--text-muted))' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-dm-sans text-xs" style={{ color: 'rgb(var(--text-primary))' }}>
                      {fmtDate(v.first_seen_at)}
                    </p>
                    <p className="font-dm-mono text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                      Sections consultées : {v.sections_opened.map(n => `§${n}`).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 font-dm-mono text-xs flex-shrink-0" style={{ color: 'rgb(var(--text-secondary))' }}>
                    <Clock className="w-3 h-3" />
                    {fmtTime(v.total_time_s)}
                  </div>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center font-dm-mono text-xs" style={{ background: 'rgba(156,65,65,0.12)', color: '#9C4141' }}>
                    {v.sections_opened.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
