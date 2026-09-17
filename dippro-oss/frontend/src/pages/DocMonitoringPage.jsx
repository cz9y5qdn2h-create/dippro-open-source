import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  Eye, Plus, Trash2, RefreshCw, ExternalLink, AlertTriangle,
  CheckCircle, Search, Globe, Tag, X, ChevronDown, ChevronUp,
  Newspaper, Rss
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const CATEGORY_COLOR = {
  franchise: 'rgba(156,65,65,0.80)',
  juridique: 'rgba(96,165,250,0.80)',
  réglementaire: 'rgba(248,113,113,0.80)',
};

function NewsWidget() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['monitoring-news'],
    queryFn: () => api.get('/monitoring/news').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(156,65,65,0.08)', border: '0.5px solid rgba(156,65,65,0.18)' }}>
            <Newspaper size={16} style={{ color: 'var(--v2-gold)' }} />
          </div>
          <div>
            <h3 className="font-cormorant text-lg text-text-primary" style={{ fontWeight: 400 }}>
              Actualités franchise & juridique
            </h3>
            {data && (
              <p className="font-dm-mono text-xs text-text-secondary" style={{ fontSize: 10 }}>
                {data.feedsOk}/{data.feedsTotal} sources · {data.items?.length || 0} articles
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-ghost flex items-center gap-1.5"
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="btn-ghost"
            style={{ padding: '6px 8px' }}
          >
            {expanded ? <ChevronUp size={14} className="text-text-secondary" /> : <ChevronDown size={14} className="text-text-secondary" />}
          </button>
        </div>
      </div>

      {expanded && (
        isLoading ? (
          <div className="flex items-center justify-center py-8"><LoadingSpinner size="sm" /></div>
        ) : !data?.items?.length ? (
          <p className="font-dm-sans text-sm text-text-secondary text-center py-6">
            Aucun article récupéré — les flux RSS sont peut-être temporairement indisponibles.
          </p>
        ) : (
          <div className="space-y-1 divide-y" style={{ '--tw-divide-opacity': 0.06 }}>
            {data.items.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 py-3 group hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                  style={{ background: CATEGORY_COLOR[item.category] || 'rgb(var(--text-muted))' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span
                      className="font-dm-mono text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: 'rgba(156,65,65,0.06)', color: 'rgba(156,65,65,0.65)', border: '0.5px solid rgba(156,65,65,0.12)' }}
                    >
                      {item.source}
                    </span>
                    {item.date && (
                      <span className="font-dm-mono text-text-muted" style={{ fontSize: 10 }}>
                        {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: fr })}
                      </span>
                    )}
                    {item.impact_level && item.impact_level !== 'none' && (
                      <ImpactBadge level={item.impact_level} pulse />
                    )}
                  </div>
                  <p className="font-dm-sans text-sm text-text-primary group-hover:text-gold transition-colors leading-snug">
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="font-dm-sans text-xs text-text-secondary mt-0.5 line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>
                  )}
                  {item.impact_reason && (
                    <p className="font-dm-sans text-xs mt-1 leading-relaxed" style={{ color: IMPACT_CONFIG[item.impact_level]?.textColor }}>
                      {item.impact_reason}
                    </p>
                  )}
                </div>
                <ExternalLink size={12} className="text-text-muted group-hover:text-gold flex-shrink-0 mt-1 transition-colors" />
              </a>
            ))}
          </div>
        )
      )}
    </div>
  );
}

const SUGGESTED_SOURCES = [
  {
    name: 'Journal Officiel – Légifrance',
    url: 'https://www.legifrance.gouv.fr/',
    description: 'Textes officiels et jurisprudence',
    keywords: ['franchise', 'Loi Doubin', 'L330-3']
  },
  {
    name: 'Fédération Française de la Franchise',
    url: 'https://www.franchise-fff.com/',
    description: 'Actualités du secteur',
    keywords: ['franchise', 'DIP', 'réseau']
  },
  {
    name: 'Village de la Justice',
    url: 'https://www.village-justice.com/',
    description: 'Veille juridique franchise',
    keywords: ['franchise', 'Doubin', 'contrat', 'DIP']
  }
];

const IMPACT_CONFIG = {
  none:     { label: 'Aucun impact',  color: 'rgba(150,150,150,0.15)', textColor: 'rgb(var(--text-secondary))', border: 'rgba(150,150,150,0.3)' },
  low:      { label: 'Faible',        color: 'rgba(59,130,246,0.12)',  textColor: '#60a5fa',                   border: 'rgba(59,130,246,0.3)' },
  medium:   { label: 'Modéré',        color: 'rgba(245,158,11,0.12)',  textColor: '#f59e0b',                   border: 'rgba(245,158,11,0.3)' },
  high:     { label: 'Élevé',         color: 'rgba(239,68,68,0.12)',   textColor: '#ef4444',                   border: 'rgba(239,68,68,0.3)' },
  critical: { label: 'Critique',      color: 'rgba(185,28,28,0.18)',   textColor: '#fca5a5',                   border: 'rgba(185,28,28,0.5)' }
};

function ImpactBadge({ level, pulse }) {
  const cfg = IMPACT_CONFIG[level] || IMPACT_CONFIG.none;
  return (
    <span
      className={pulse && level === 'critical' ? 'animate-pulse' : ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        background: cfg.color,
        color: cfg.textColor,
        border: `0.5px solid ${cfg.border}`,
        fontFamily: 'var(--font-mono, monospace)'
      }}
    >
      {level === 'critical' && <AlertTriangle size={10} />}
      {(level === 'none' || level === 'low') && <CheckCircle size={10} />}
      {cfg.label.toUpperCase()}
    </span>
  );
}

function SourceCard({ source, onCheck, onDelete, checking }) {
  const lastResult = source.monitoring_results?.sort(
    (a, b) => new Date(b.checked_at) - new Date(a.checked_at)
  )[0];

  const truncateUrl = (url) => {
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname !== '/' ? u.pathname.slice(0, 30) : '');
    } catch {
      return url.slice(0, 40);
    }
  };

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
            style={{ background: 'rgba(156,65,65,0.08)', border: '0.5px solid rgba(156,65,65,0.18)' }}
          >
            <Globe size={16} className="text-gold" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-dm-sans text-sm font-semibold text-text-primary truncate">{source.name}</h3>
              {lastResult && <ImpactBadge level={lastResult.impact_level} pulse />}
            </div>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 mt-0.5 hover:underline"
              style={{ color: 'rgb(var(--gold))', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)' }}
            >
              {truncateUrl(source.url)}
              <ExternalLink size={10} />
            </a>
            {source.description && (
              <p className="font-dm-sans text-xs text-text-secondary mt-1">{source.description}</p>
            )}
            {source.keywords?.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                <Tag size={10} style={{ color: 'rgb(var(--text-secondary))' }} />
                {source.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="font-dm-mono text-xs px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(156,65,65,0.06)', color: 'rgba(156,65,65,0.7)', border: '0.5px solid rgba(156,65,65,0.14)' }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
            {lastResult?.impact_summary && (
              <p className="font-dm-sans text-xs mt-2" style={{ color: 'rgb(var(--text-secondary))' }}>
                {lastResult.impact_summary}
              </p>
            )}
            {source.last_checked_at && (
              <p className="font-dm-mono text-xs mt-1.5" style={{ color: 'rgba(var(--text-secondary-rgb, 150,150,150), 0.6)', fontSize: '10px' }}>
                Vérifié {formatDistanceToNow(new Date(source.last_checked_at), { addSuffix: true, locale: fr })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onCheck(source.id)}
            disabled={checking}
            className="btn-ghost flex items-center gap-1.5"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            title="Vérifier maintenant"
          >
            <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Vérification…' : 'Vérifier'}
          </button>
          <button
            onClick={() => onDelete(source.id)}
            className="btn-ghost"
            style={{ padding: '6px 8px', color: 'rgba(239,68,68,0.7)' }}
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddSourceModal({ onClose, onAdd, prefill }) {
  const [form, setForm] = useState({
    name: prefill?.name || '',
    url: prefill?.url || '',
    description: prefill?.description || '',
    keywords: prefill?.keywords || []
  });
  const [kwInput, setKwInput] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addKeyword = (e) => {
    if (e.key === 'Enter' && kwInput.trim()) {
      e.preventDefault();
      if (!form.keywords.includes(kwInput.trim())) {
        set('keywords', [...form.keywords, kwInput.trim()]);
      }
      setKwInput('');
    }
  };

  const removeKeyword = (kw) => set('keywords', form.keywords.filter(k => k !== kw));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) {
      toast.error('Nom et URL sont requis');
      return;
    }
    setLoading(true);
    try {
      await onAdd(form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card w-full max-w-lg"
        style={{ padding: 'clamp(16px, 4vw, 28px)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-cormorant text-xl text-text-primary" style={{ fontWeight: 400 }}>
            Ajouter une source
          </h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-dm-sans text-xs font-medium text-text-secondary block mb-1.5">
              Nom <span className="text-danger">*</span>
            </label>
            <input
              className="input-field w-full"
              placeholder="Ex : Journal Officiel"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="font-dm-sans text-xs font-medium text-text-secondary block mb-1.5">
              URL <span className="text-danger">*</span>
            </label>
            <input
              className="input-field w-full"
              placeholder="https://..."
              type="url"
              value={form.url}
              onChange={e => set('url', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="font-dm-sans text-xs font-medium text-text-secondary block mb-1.5">
              Description <span className="font-dm-mono" style={{ fontSize: '10px', opacity: 0.5 }}>(optionnel)</span>
            </label>
            <input
              className="input-field w-full"
              placeholder="Ex : Veille réglementaire franchise"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div>
            <label className="font-dm-sans text-xs font-medium text-text-secondary block mb-1.5">
              Mots-clés à surveiller <span className="font-dm-mono" style={{ fontSize: '10px', opacity: 0.5 }}>(Entrée pour ajouter)</span>
            </label>
            <input
              className="input-field w-full"
              placeholder="franchise, DIP, Loi Doubin…"
              value={kwInput}
              onChange={e => setKwInput(e.target.value)}
              onKeyDown={addKeyword}
            />
            {form.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.keywords.map(kw => (
                  <span
                    key={kw}
                    className="flex items-center gap-1 font-dm-mono text-xs px-2 py-0.5 rounded-full cursor-pointer"
                    style={{ background: 'rgba(156,65,65,0.1)', color: 'rgba(156,65,65,0.85)', border: '0.5px solid rgba(156,65,65,0.2)' }}
                    onClick={() => removeKeyword(kw)}
                  >
                    {kw}
                    <X size={9} />
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Ajout…' : 'Ajouter la source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResultRow({ result }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = IMPACT_CONFIG[result.impact_level] || IMPACT_CONFIG.none;

  return (
    <div
      className="border-b last:border-b-0"
      style={{ borderColor: 'rgba(var(--border-rgb, 156,65,65), 0.08)' }}
    >
      <div
        className="flex items-start gap-3 py-3 px-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => result.impact_detail && setExpanded(e => !e)}
      >
        <div
          className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
          style={{ background: cfg.textColor }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-dm-sans text-xs font-semibold text-text-primary">
              {result.monitoring_sources?.name || '—'}
            </span>
            <ImpactBadge level={result.impact_level} />
          </div>
          {result.impact_summary && (
            <p className="font-dm-sans text-xs text-text-secondary mt-0.5">{result.impact_summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-dm-mono text-xs" style={{ color: 'rgb(var(--text-secondary))', fontSize: '10px' }}>
            {formatDistanceToNow(new Date(result.checked_at), { addSuffix: true, locale: fr })}
          </span>
          {result.impact_detail && (
            expanded ? <ChevronUp size={12} className="text-text-secondary" /> : <ChevronDown size={12} className="text-text-secondary" />
          )}
        </div>
      </div>
      {expanded && result.impact_detail && (
        <div
          className="px-4 pb-3"
          style={{ marginLeft: '28px' }}
        >
          <p className="font-dm-sans text-xs text-text-secondary leading-relaxed"
            style={{ padding: '10px 12px', background: 'rgba(156,65,65,0.04)', borderRadius: '8px', border: '0.5px solid rgba(156,65,65,0.1)' }}
          >
            {result.impact_detail}
          </p>
        </div>
      )}
    </div>
  );
}

export default function DocMonitoringPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [modalPrefill, setModalPrefill] = useState(null);
  const [checkingId, setCheckingId] = useState(null);

  const { data: sources = [], isLoading: sourcesLoading } = useQuery({
    queryKey: ['monitoring-sources'],
    queryFn: () => api.get('/monitoring/sources').then(r => r.data)
  });

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['monitoring-results'],
    queryFn: () => api.get('/monitoring/results').then(r => r.data)
  });

  const addMutation = useMutation({
    mutationFn: (payload) => api.post('/monitoring/sources', payload).then(r => r.data),
    onSuccess: () => {
      toast.success('Source ajoutée');
      queryClient.invalidateQueries({ queryKey: ['monitoring-sources'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete('/monitoring/sources/' + id),
    onSuccess: () => {
      toast.success('Source supprimée');
      queryClient.invalidateQueries({ queryKey: ['monitoring-sources'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-results'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const handleCheck = async (sourceId) => {
    setCheckingId(sourceId);
    try {
      const { data } = await api.post('/monitoring/check/' + sourceId);
      if (data.fetchError) {
        toast.error('Impossible de récupérer la page');
      } else if (data.changeDetected) {
        toast('Changement détecté !', { icon: '⚠️' });
      } else {
        toast.success('Vérification terminée — aucun changement');
      }
      queryClient.invalidateQueries({ queryKey: ['monitoring-sources'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-results'] });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCheckingId(null);
    }
  };

  const openModalWithPrefill = (suggestion) => {
    setModalPrefill(suggestion);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalPrefill(null);
  };

  const recentResults = results.slice(0, 10);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Eye size={22} className="text-gold" />
            {t('monitoring.title')}
          </span>
        }
        subtitle={t('monitoring.subtitle')}
        action={
          <button
            onClick={() => { setModalPrefill(null); setShowModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={15} />
            {t('monitoring.addSource')}
          </button>
        }
      />

      {/* Flux d'actualités franchise */}
      <NewsWidget />

      {sourcesLoading ? (
        <div className="card flex items-center justify-center py-16">
          <LoadingSpinner size="md" />
        </div>
      ) : sources.length === 0 ? (
        <div className="space-y-4">
          <div className="card flex flex-col items-center justify-center text-center py-16 gap-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(156,65,65,0.08)', border: '0.5px solid rgba(156,65,65,0.22)' }}
            >
              <Search size={28} className="text-gold" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h2 className="font-cormorant text-2xl text-text-primary" style={{ fontWeight: 300 }}>
                {t('monitoring.empty.title')}
              </h2>
              <p className="font-dm-sans text-sm text-text-secondary">
                {t('monitoring.empty.desc')}
              </p>
            </div>
            <button
              onClick={() => { setModalPrefill(null); setShowModal(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={15} />
              {t('monitoring.empty.cta')}
            </button>
          </div>

          <div className="card" style={{ padding: '20px 24px' }}>
            <h3 className="font-cormorant text-lg text-text-primary mb-4" style={{ fontWeight: 400 }}>
              {t('monitoring.suggestions.title')}
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {SUGGESTED_SOURCES.map((s) => (
                <button
                  key={s.url}
                  onClick={() => openModalWithPrefill(s)}
                  className="text-left p-3 rounded-xl transition-all hover:scale-[1.01]"
                  style={{
                    background: 'rgba(156,65,65,0.04)',
                    border: '0.5px solid rgba(156,65,65,0.14)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Globe size={13} className="text-gold flex-shrink-0" />
                    <span className="font-dm-sans text-sm font-semibold text-text-primary">{s.name}</span>
                  </div>
                  <p className="font-dm-sans text-xs text-text-secondary">{s.description}</p>
                  <p className="font-dm-mono text-xs mt-1" style={{ color: 'rgba(156,65,65,0.55)', fontSize: '10px' }}>
                    {s.url.replace('https://', '')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onCheck={handleCheck}
              onDelete={(id) => {
                if (window.confirm('Supprimer cette source de surveillance ?')) {
                  deleteMutation.mutate(id);
                }
              }}
              checking={checkingId === source.id}
            />
          ))}
        </div>
      )}

      {!sourcesLoading && sources.length > 0 && (
        <div className="card" style={{ padding: '20px 24px' }}>
          <h3 className="font-cormorant text-lg text-text-primary mb-1" style={{ fontWeight: 400 }}>
            {t('monitoring.results.title')}
          </h3>
          <p className="font-dm-sans text-xs text-text-secondary mb-4">{t('monitoring.results.subtitle')}</p>

          {resultsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : recentResults.length === 0 ? (
            <p className="font-dm-sans text-sm text-text-secondary text-center py-6">
              {t('monitoring.results.empty')}
            </p>
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '0.5px solid rgba(156,65,65,0.12)' }}
            >
              {recentResults.map((result) => (
                <ResultRow key={result.id} result={result} />
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <AddSourceModal
          onClose={closeModal}
          onAdd={(payload) => addMutation.mutateAsync(payload)}
          prefill={modalPrefill}
        />
      )}
    </div>
  );
}
