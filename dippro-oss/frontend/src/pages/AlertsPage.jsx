import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { CheckCircle, XCircle, Bell, Edit3, X, RefreshCw, Sparkles, ChevronDown, ChevronUp, MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('pending');
  const [filterSource, setFilterSource] = useState('all');
  const [validatingId, setValidatingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [ignoreId, setIgnoreId] = useState(null);
  const [ignoreReason, setIgnoreReason] = useState('');
  const [expandedCorrections, setExpandedCorrections] = useState({});
  const [answersMap, setAnswersMap] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', filter],
    queryFn: () => api.get('/alerts' + (filter !== 'all' ? '?status=' + filter : '')).then(r => r.data)
  });

  const validateMutation = useMutation({
    mutationFn: ({ id, modified_content }) =>
      api.patch('/alerts/' + id + '/validate', { modified_content }),
    onSuccess: () => {
      toast.success('Alerte validee, section mise a jour');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dips'] });
      setValidatingId(null);
    },
    onError: (err) => toast.error(err.message)
  });

  const answerMutation = useMutation({
    mutationFn: ({ id, answers }) => api.post('/alerts/' + id + '/answer-questions', { answers }),
    onSuccess: (_, { id }) => {
      toast.success('Correction générée avec vos réponses !');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setAnswersMap(prev => { const n = { ...prev }; delete n[id]; return n; });
    },
    onError: (err) => toast.error(err.message)
  });

  const ignoreMutation = useMutation({
    mutationFn: ({ id, reason }) => api.patch('/alerts/' + id + '/ignore', { reason }),
    onSuccess: () => {
      toast.success('Alerte ignoree');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setIgnoreId(null);
    },
    onError: (err) => toast.error(err.message)
  });

  const allAlerts = data?.alerts || [];
  const alerts = filterSource === 'ia'
    ? allAlerts.filter(a => a.source === 'Correction IA')
    : filterSource === 'manual'
    ? allAlerts.filter(a => a.source !== 'Correction IA')
    : allAlerts;

  const pendingCount = allAlerts.filter(a => a.status === 'pending').length;
  const iaCount = allAlerts.filter(a => a.source === 'Correction IA' && a.status === 'pending').length;

  const filters = [
    { key: 'pending', label: t('alerts.filters.pending'), count: pendingCount },
    { key: 'validated', label: t('alerts.filters.validated'), count: null },
    { key: 'ignored', label: t('alerts.filters.ignored'), count: null },
    { key: 'all', label: t('alerts.filters.all'), count: null },
  ];

  const toggleExpand = (id) => setExpandedCorrections(prev => ({ ...prev, [id]: !prev[id] }));

  const setAnswer = (alertId, qIndex, value) =>
    setAnswersMap(prev => ({
      ...prev,
      [alertId]: Object.assign([...(prev[alertId] || [])], { [qIndex]: value })
    }));

  const canSubmitAnswers = (alert) => {
    const questions = alert.questions || [];
    const answers = answersMap[alert.id] || [];
    return questions.length > 0 && questions.every((_, i) => (answers[i] || '').trim().length > 0);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('alerts.title')}
        subtitle={t('alerts.subtitle')}
      />

      {/* Résumé corrections IA en attente */}
      {iaCount > 0 && (
        <div className="card border-gold/25 bg-gold/4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-gold" />
            </div>
            <div className="flex-1">
              <p className="font-dm-sans text-sm font-medium text-text-primary">
                {iaCount} {t('alerts.pendingCount')}
              </p>
              <p className="font-dm-sans text-xs text-text-secondary mt-0.5">
                {t('alerts.applyHint')}
              </p>
            </div>
            <button
              onClick={() => { setFilter('pending'); setFilterSource('ia'); }}
              className="btn-secondary text-xs py-1.5 flex-shrink-0"
            >
              {t('alerts.showAiOnly')}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="filter-scroll">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={'flex items-center gap-2 px-4 py-2 rounded font-dm-sans text-sm transition-all duration-300 flex-shrink-0 ' +
                (filter === f.key
                  ? 'bg-gold/10 text-gold border border-gold/30'
                  : 'text-text-secondary border border-border-subtle hover:border-border-default hover:text-text-primary')}
            >
              {f.label}
              {f.count !== null && f.count > 0 && (
                <span className="font-dm-mono text-xs bg-danger/20 text-danger px-1.5 rounded">{f.count}</span>
              )}
            </button>
          ))}
          <div className="w-px h-6 bg-border-subtle self-center mx-1 flex-shrink-0" />
          {[
            { key: 'all', label: t('alerts.filters.all') },
            { key: 'ia', label: '✦ ' + t('alerts.sources.ai'), count: iaCount },
            { key: 'manual', label: t('alerts.sources.manual') }
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilterSource(s.key)}
              className={'flex items-center gap-2 px-3 py-2 rounded font-dm-sans text-xs transition-all duration-300 flex-shrink-0 ' +
                (filterSource === s.key
                  ? 'bg-gold/10 text-gold border border-gold/30'
                  : 'text-text-muted border border-border-subtle hover:text-text-secondary')}
            >
              {s.label}
              {s.count > 0 && <span className="font-dm-mono text-xs bg-gold/20 text-gold px-1.5 rounded">{s.count}</span>}
            </button>
          ))}
        </div>
        <button
          onClick={async () => {
            const t = toast.loading('Vérification en cours…');
            try {
              const res = await api.post('/alerts/check-renewal');
              const n = res.data.alerts_created;
              toast.success(n > 0 ? `${n} alerte(s) de renouvellement créée(s)` : 'Aucun renouvellement à signaler', { id: t });
              queryClient.invalidateQueries({ queryKey: ['alerts'] });
            } catch (err) {
              toast.error(err.message, { id: t });
            }
          }}
          className="btn-secondary flex items-center gap-2 text-sm py-2 flex-shrink-0 self-end sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" /> {t('alerts.checkRenewal')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-24">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-success/10 border border-success/20 mb-6">
            <Bell className="w-8 h-8 text-success/60" />
          </div>
          <p className="font-cormorant text-2xl text-text-primary mb-2">
            {filter === 'pending' ? t('alerts.empty.title') : t('common.none')}
          </p>
          {filter === 'pending' && (
            <p className="font-dm-sans text-sm text-text-secondary">{t('alerts.empty.desc')}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => {
            const isIaCorrection = alert.source === 'Correction IA';
            const expanded = expandedCorrections[alert.id];
            let correctionsMade = [];
            let remainingIssues = [];
            try { correctionsMade = isIaCorrection && alert.corrections_made ? JSON.parse(alert.corrections_made) : []; } catch {}
            try { remainingIssues = isIaCorrection && alert.remaining_issues ? JSON.parse(alert.remaining_issues) : []; } catch {}

            const needsInfo = alert.needs_info && !alert.suggestion;
            const questions = needsInfo ? (alert.questions || []) : [];
            const currentAnswers = answersMap[alert.id] || [];

            return (
            <div key={alert.id} className={`card transition-all ${isIaCorrection ? 'border-gold/25 bg-gold/2' : 'border-border-default'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {isIaCorrection && (
                      <span className={`inline-flex items-center gap-1.5 font-dm-mono text-xs px-2 py-0.5 rounded border ${
                        needsInfo
                          ? 'bg-blue-500/10 text-blue-400 border-blue-400/30'
                          : 'bg-gold/10 text-gold border-gold/30'
                      }`}>
                        {needsInfo ? <MessageSquare className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                        {needsInfo ? 'Questions IA' : 'Correction IA'}
                      </span>
                    )}
                    {alert.dip_sections?.section_number && (
                      <span className="font-dm-mono text-xs text-gold/60">
                        Section {alert.dip_sections.section_number}
                      </span>
                    )}
                    {alert.contract_clauses?.clause_number && (
                      <span className="font-dm-mono text-xs text-gold/60">
                        Clause {alert.contract_clauses.clause_number}
                      </span>
                    )}
                    {alert.cross_impact_from && (
                      <span className="inline-flex items-center gap-1.5 font-dm-mono text-xs px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-400/30">
                        <RefreshCw className="w-3 h-3" />
                        Impact croisé ({alert.cross_impact_from === 'dip' ? 'DIP → Contrat' : 'Contrat → DIP'})
                      </span>
                    )}
                    <StatusBadge status={alert.urgency || 'moyenne'} />
                    <StatusBadge status={alert.status} />
                    {isIaCorrection && alert.ai_confidence && (
                      <span className={`font-dm-mono text-xs px-2 py-0.5 rounded border ${
                        alert.ai_confidence === 'haute' ? 'bg-success/10 text-success border-success/20' :
                        alert.ai_confidence === 'moyenne' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-danger/10 text-danger border-danger/20'
                      }`}>
                        Confiance {alert.ai_confidence}
                      </span>
                    )}
                  </div>
                  <h3 className="font-dm-sans text-base text-text-primary">
                    {alert.dip_sections?.section_title || alert.contract_clauses?.clause_title || alert.title || 'Élément inconnu'}
                  </h3>
                  <p className="font-dm-mono text-xs text-text-secondary mt-1">
                    {alert.source} {alert.created_at && '\u00b7 ' + formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </div>

              {/* Questions IA \u2014 informations manquantes */}
              {needsInfo && (
                <div className="space-y-4 mb-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl" style={{
                    background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)'
                  }}>
                    <MessageSquare className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-dm-sans text-sm font-medium text-text-primary">
                        L'IA a besoin d'informations pour corriger cette section
                      </p>
                      <p className="font-dm-sans text-xs text-text-secondary mt-0.5">
                        R\u00e9pondez aux questions ci-dessous pour g\u00e9n\u00e9rer une correction pr\u00e9cise et conforme.
                      </p>
                    </div>
                  </div>

                  {questions.map((question, i) => (
                    <div key={i} className="space-y-1.5">
                      <label className="font-dm-sans text-sm text-text-primary flex items-start gap-2">
                        <span className="font-dm-mono text-xs text-gold mt-0.5 flex-shrink-0">{i + 1}.</span>
                        {question}
                      </label>
                      <textarea
                        rows={2}
                        className="input-field text-sm resize-none"
                        placeholder="Votre r\u00e9ponse\u2026"
                        value={currentAnswers[i] || ''}
                        onChange={e => setAnswer(alert.id, i, e.target.value)}
                      />
                    </div>
                  ))}

                  <button
                    onClick={() => answerMutation.mutate({ id: alert.id, answers: Array.from({ length: questions.length }, (_, i) => currentAnswers[i] || '') })}
                    disabled={!canSubmitAnswers(alert) || answerMutation.isPending}
                    className="btn-liquid-glass-prominent flex items-center gap-2 text-sm py-2.5"
                  >
                    {answerMutation.isPending && answerMutation.variables?.id === alert.id
                      ? <LoadingSpinner size="sm" />
                      : <Send className="w-4 h-4" />
                    }
                    G\u00e9n\u00e9rer la correction IA
                  </button>
                </div>
              )}

              {/* Correction IA \u2014 affichage sp\u00e9cialis\u00e9 */}
              {isIaCorrection && !needsInfo ? (
                <div className="space-y-3 mb-4">
                  {/* Texte corrig\u00e9 propos\u00e9 */}
                  <div className="bg-gold/5 border border-gold/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-dm-mono text-xs text-gold flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Texte corrig\u00e9 propos\u00e9 par l'IA
                      </p>
                      <button
                        onClick={() => toggleExpand(alert.id)}
                        className="font-dm-sans text-xs text-text-muted hover:text-text-secondary flex items-center gap-1"
                      >
                        {expanded ? <><ChevronUp className="w-3 h-3" /> R\u00e9duire</> : <><ChevronDown className="w-3 h-3" /> Voir tout</>}
                      </button>
                    </div>
                    <p className={`font-dm-sans text-sm text-text-primary leading-relaxed whitespace-pre-wrap ${!expanded ? 'line-clamp-4' : ''}`}>
                      {alert.suggestion}
                    </p>
                  </div>

                  {/* Corrections apport\u00e9es */}
                  {correctionsMade.length > 0 && (
                    <div className="bg-success/5 border border-success/15 rounded-lg p-3">
                      <p className="font-dm-mono text-xs text-success mb-2">Corrections apport\u00e9es</p>
                      <ul className="space-y-1">
                        {correctionsMade.map((c, i) => (
                          <li key={i} className="font-dm-sans text-xs text-text-secondary flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 text-success flex-shrink-0 mt-0.5" /> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Donn\u00e9es encore \u00e0 compl\u00e9ter */}
                  {remainingIssues.length > 0 && (
                    <div className="bg-danger/5 border border-danger/15 rounded-lg p-3">
                      <p className="font-dm-mono text-xs text-danger mb-2">\u00c0 compl\u00e9ter par vos soins</p>
                      <ul className="space-y-1">
                        {remainingIssues.map((issue, i) => (
                          <li key={i} className="font-dm-sans text-xs text-text-secondary flex items-start gap-2">
                            <XCircle className="w-3 h-3 text-danger flex-shrink-0 mt-0.5" /> {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {(alert.old_value || alert.new_value) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {alert.old_value && (
                        <div className="bg-danger/5 border border-danger/20 rounded p-3">
                          <p className="font-dm-mono text-xs text-danger mb-2">Ancienne valeur</p>
                          <p className="font-dm-sans text-sm text-text-primary">{alert.old_value}</p>
                        </div>
                      )}
                      {alert.new_value && (
                        <div className="bg-success/5 border border-success/20 rounded p-3">
                          <p className="font-dm-mono text-xs text-success mb-2">Nouvelle valeur</p>
                          <p className="font-dm-sans text-sm text-text-primary">{alert.new_value}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {alert.suggestion && (
                    <div className="bg-gold/5 border border-gold/20 rounded p-3 mb-4">
                      <p className="font-dm-mono text-xs text-gold mb-2">Suggestion</p>
                      <p className="font-dm-sans text-sm text-text-primary">{alert.suggestion}</p>
                    </div>
                  )}
                </>
              )}

              {/* Zone de modification avant validation */}
              {validatingId === alert.id && (
                <div className="mb-4 animate-slide-up">
                  <label className="label">
                    {isIaCorrection ? 'Modifier le texte corrigé avant application' : 'Modifier avant validation'}
                  </label>
                  <textarea
                    className="input-field min-h-36 resize-none font-dm-mono text-sm"
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                  />
                </div>
              )}

              {ignoreId === alert.id && (
                <div className="mb-4 animate-slide-up">
                  <label className="label">Raison (optionnel)</label>
                  <input type="text" className="input-field" value={ignoreReason}
                    onChange={e => setIgnoreReason(e.target.value)}
                    placeholder="Ex : information déjà prise en compte…"
                  />
                </div>
              )}

              {alert.status === 'pending' && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-4 border-t border-border-subtle">
                  {validatingId === alert.id ? (
                    <>
                      <button
                        onClick={() => validateMutation.mutate({ id: alert.id, modified_content: editContent || null })}
                        disabled={validateMutation.isPending}
                        className="btn-liquid-glass-prominent flex items-center justify-center gap-2 text-sm py-2 w-full sm:w-auto"
                      >
                        {validateMutation.isPending && <LoadingSpinner size="sm" />}
                        <CheckCircle className="w-4 h-4" />
                        {isIaCorrection ? 'Appliquer la correction' : 'Confirmer'}
                      </button>
                      <button onClick={() => setValidatingId(null)} className="btn-ghost text-sm w-full sm:w-auto justify-center">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : ignoreId === alert.id ? (
                    <>
                      <button
                        onClick={() => ignoreMutation.mutate({ id: alert.id, reason: ignoreReason })}
                        disabled={ignoreMutation.isPending}
                        className="btn-secondary flex items-center justify-center gap-2 text-sm py-2 w-full sm:w-auto"
                      >
                        {ignoreMutation.isPending && <LoadingSpinner size="sm" />}
                        <XCircle className="w-4 h-4" /> Confirmer
                      </button>
                      <button onClick={() => setIgnoreId(null)} className="btn-ghost text-sm w-full sm:w-auto justify-center">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      {!needsInfo && (isIaCorrection ? (
                        <button
                          onClick={() => { setValidatingId(alert.id); setEditContent(alert.suggestion || ''); }}
                          className="btn-liquid-glass-prominent flex items-center justify-center gap-2 text-sm py-2 w-full sm:w-auto"
                        >
                          <Sparkles className="w-4 h-4" /> Appliquer la correction IA
                        </button>
                      ) : (
                        <button
                          onClick={() => { setValidatingId(alert.id); setEditContent(alert.suggestion || alert.new_value || ''); }}
                          className="btn-primary flex items-center justify-center gap-2 text-sm py-2 w-full sm:w-auto"
                        >
                          <CheckCircle className="w-4 h-4" /> Valider
                        </button>
                      ))}
                      {!needsInfo && (
                        <button
                          onClick={() => { setValidatingId(alert.id); setEditContent(alert.suggestion || alert.new_value || ''); }}
                          className="btn-secondary flex items-center justify-center gap-2 text-sm py-2 w-full sm:w-auto"
                        >
                          <Edit3 className="w-4 h-4" /> Modifier avant d'appliquer
                        </button>
                      )}
                      <button
                        onClick={() => { setIgnoreId(alert.id); setIgnoreReason(''); }}
                        className="btn-ghost flex items-center justify-center gap-2 text-sm text-danger hover:text-danger w-full sm:w-auto"
                      >
                        <XCircle className="w-4 h-4" /> Ignorer
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}