import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import LiquidGlassBtn from '../components/ui/LiquidGlassBtn';
import toast from 'react-hot-toast';
import {
  Sparkles, Wand2, ListChecks, FileText, Save, CheckCircle,
  AlertTriangle, ChevronRight, Pencil, X as XIcon, Check,
} from 'lucide-react';

const ASSISTED_FIELDS = [
  { key: 'duree_annees', label: 'Durée du contrat (années)', placeholder: '5' },
  { key: 'renouvellement', label: 'Conditions de renouvellement', placeholder: 'Renouvellement tacite sauf dénonciation 6 mois avant échéance' },
  { key: 'preavis_resiliation', label: 'Préavis de résiliation', placeholder: '30 jours après mise en demeure restée infructueuse' },
  { key: 'non_concurrence_duree', label: 'Durée de la clause de non-concurrence', placeholder: '1 an après la fin du contrat' },
  { key: 'non_concurrence_perimetre', label: 'Périmètre de non-concurrence', placeholder: 'Rayon de 5 km autour de l\'ancien point de vente' },
  { key: 'droit_preemption', label: 'Droit de préemption du franchiseur en cas de cession', type: 'select', options: ['oui', 'non'] },
  { key: 'juridiction_competente', label: 'Juridiction compétente', placeholder: 'Tribunal de Commerce de Paris' },
  { key: 'mode_reglement_litiges', label: 'Mode de règlement des litiges', type: 'select', options: ['Tribunal de Commerce', 'Médiation préalable obligatoire', 'Arbitrage'] },
];

export default function GenerateContractPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('full');
  const [selectedDipId, setSelectedDipId] = useState(null);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [savedContractId, setSavedContractId] = useState(null);
  const [progress, setProgress] = useState(null);

  const { data: dipsData, isLoading: dipsLoading } = useQuery({
    queryKey: ['dips'],
    queryFn: () => api.get('/dip').then(r => r.data),
  });

  const dips = dipsData?.dips || [];
  const activeDip = dips.find(d => d.status === 'actif') ?? dips[0];
  const dipId = selectedDipId ?? activeDip?.id;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('access_token');
      const base = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
        : '';

      const response = await fetch(`${base}/api/contracts/generate-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ dip_id: dipId, formData: mode === 'assisted' ? form : {} }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(err.error || 'Erreur de génération');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === 'progress') setProgress({ step: ev.step, pct: ev.pct });
            else if (ev.type === 'done') finalResult = ev.result;
            else if (ev.type === 'error') throw new Error(ev.error);
          } catch (e) {
            if (e.message && !e.message.startsWith('{')) throw e;
          }
        }
      }

      if (!finalResult) throw new Error('Génération incomplète. Réessayez.');
      return finalResult;
    },
    onSuccess: (res) => {
      setResult(res);
      setProgress(null);
      toast.success('Contrat généré avec succès !');
    },
    onError: (err) => {
      setProgress(null);
      toast.error(err.message);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (editedClauses) => api.post('/contracts/create-from-agent', {
      title: activeDip ? `Contrat ${activeDip.title}` : 'Contrat généré',
      clauses: editedClauses,
      global_score: result?.global_score,
      dip_id: dipId,
    }),
    onSuccess: (res) => {
      setSavedContractId(res.data.contract?.id);
      toast.success('Contrat sauvegardé !');
    },
    onError: (err) => toast.error(err.message),
  });

  const updateField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  if (dipsLoading) {
    return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;
  }

  if (!activeDip) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
        <PageHeader title="Générer un contrat" subtitle="L'IA rédige votre contrat de franchise à partir d'un DIP existant" />
        <div className="card border-dashed border-border-default text-center py-12">
          <FileText className="w-8 h-8 text-gold mx-auto mb-3" />
          <p className="font-dm-sans text-sm text-text-primary font-medium">Aucun DIP disponible</p>
          <p className="font-dm-sans text-xs text-text-secondary mt-1">Importez ou générez un DIP avant de créer un contrat.</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <ResultView
        result={result}
        dipTitle={activeDip.title}
        savedContractId={savedContractId}
        onSave={(editedClauses) => saveMutation.mutate(editedClauses)}
        onNavigateContract={() => navigate('/contrat')}
        isSaving={saveMutation.isPending}
        onReset={() => { setResult(null); setSavedContractId(null); }}
      />
    );
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <PageHeader
        title="Générer un contrat"
        subtitle="L'IA rédige votre contrat de franchise à partir des données déjà présentes dans votre DIP"
      />

      {dips.length > 1 && (
        <div className="card">
          <h2 className="font-cormorant text-xl mb-4">DIP source</h2>
          <div className="space-y-2">
            {dips.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDipId(d.id)}
                className={`lg-row w-full justify-between gap-3 text-left ${dipId === d.id ? 'border border-gold/40' : ''}`}
              >
                <span className="font-dm-sans text-sm text-text-primary truncate">{d.title}</span>
                <span className="font-dm-mono text-xs text-gold flex-shrink-0">{d.conformity_score ?? 0}%</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="font-cormorant text-xl mb-4">Mode de génération</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setMode('full')}
            className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${mode === 'full' ? 'border-gold bg-gold/10' : 'border-border-default hover:border-border-subtle'}`}
          >
            <Sparkles className={`w-5 h-5 flex-shrink-0 mt-0.5 ${mode === 'full' ? 'text-gold' : 'text-text-secondary'}`} />
            <div>
              <p className="font-dm-sans text-sm font-medium text-text-primary">Rédaction complète IA</p>
              <p className="font-dm-sans text-xs text-text-secondary mt-1">L'IA rédige les 10 clauses uniquement à partir du contenu de votre DIP.</p>
            </div>
          </button>
          <button
            onClick={() => setMode('assisted')}
            className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${mode === 'assisted' ? 'border-gold bg-gold/10' : 'border-border-default hover:border-border-subtle'}`}
          >
            <Wand2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${mode === 'assisted' ? 'text-gold' : 'text-text-secondary'}`} />
            <div>
              <p className="font-dm-sans text-sm font-medium text-text-primary">Assistée</p>
              <p className="font-dm-sans text-xs text-text-secondary mt-1">Complétez quelques précisions spécifiques au contrat avant la génération.</p>
            </div>
          </button>
        </div>
      </div>

      {mode === 'assisted' && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="w-4 h-4 text-gold" />
            <h2 className="font-cormorant text-xl">Précisions complémentaires</h2>
          </div>
          <p className="font-dm-sans text-xs text-text-secondary mb-5">
            Ces informations sont propres au contrat et ne figurent pas toujours dans le DIP. Laissez vide pour que l'IA propose une formulation standard.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {ASSISTED_FIELDS.map(field => (
              <div key={field.key} className={field.type === undefined ? 'sm:col-span-2' : ''}>
                <label className="label">{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    className="input-field"
                    value={form[field.key] || ''}
                    onChange={e => updateField(field.key, e.target.value)}
                  >
                    <option value="">—</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    className="input-field"
                    value={form[field.key] || ''}
                    onChange={e => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {progress && (
        <div className="card border-gold/20 bg-gold/3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-dm-sans text-sm text-text-primary font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold animate-pulse" />
              {progress.step}
            </p>
            <span className="font-dm-mono text-xs text-gold">{progress.pct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(156,65,65,0.15)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress.pct}%`, background: 'linear-gradient(90deg, #9C4141, #6E2C2C)' }}
            />
          </div>
          <p className="font-dm-mono text-xs text-text-muted">Claude Opus 5 · 30-60s estimés</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="font-dm-sans text-xs text-text-secondary">
          DIP source : <span className="text-text-primary">{activeDip.title}</span> — {activeDip.conformity_score ?? 0}%
        </p>
        {generateMutation.isPending ? (
          <button disabled className="btn-primary flex items-center gap-2 opacity-70 cursor-not-allowed">
            <LoadingSpinner size="sm" /> Rédaction en cours…
          </button>
        ) : (
          <LiquidGlassBtn
            onClick={() => generateMutation.mutate()}
            padding="10px 22px"
            cornerRadius={10}
            displacementScale={60}
            blurAmount={0.08}
            saturation={140}
            aberrationIntensity={1.5}
            elasticity={0.2}
            mode="prominent"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'white' }}>
              <Sparkles style={{ width: 16, height: 16 }} />
              Générer le contrat
              <ChevronRight style={{ width: 14, height: 14 }} />
            </span>
          </LiquidGlassBtn>
        )}
      </div>
    </div>
  );
}

function ResultView({ result, dipTitle, savedContractId, onSave, onNavigateContract, isSaving, onReset }) {
  const [clauses, setClauses] = useState(result.clauses || []);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editText, setEditText] = useState('');

  const conformes = clauses.filter(c => c.status === 'conforme').length;

  const startEdit = (idx) => {
    setEditingIdx(idx);
    setEditText(clauses[idx]?.content || '');
  };

  const commitEdit = (idx) => {
    setClauses(prev => prev.map((c, i) =>
      i === idx ? { ...c, content: editText, status: editText === 'À compléter' ? 'non_conforme' : 'a_verifier' } : c
    ));
    setEditingIdx(null);
  };

  const SaveBtn = ({ className = '' }) => (
    <button
      onClick={() => onSave(clauses)}
      disabled={isSaving || !!savedContractId}
      className={`btn-primary flex items-center gap-2 ${savedContractId ? 'opacity-60' : ''} ${className}`}
    >
      {isSaving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
      {savedContractId ? 'Sauvegardé ✓' : 'Sauvegarder le contrat'}
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Contrat généré"
        subtitle={`${result.global_score || 0}% conformité · ${conformes}/${clauses.length} clauses · depuis « ${dipTitle} »`}
      />

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <SaveBtn />
        {savedContractId && (
          <button onClick={onNavigateContract} className="btn-liquid-glass flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            Voir le contrat
          </button>
        )}
        <button onClick={onReset} className="btn-ghost text-sm">Nouvelle génération</button>
        <p className="font-dm-mono text-xs text-text-muted ml-auto hidden sm:block">
          Cliquez sur une clause pour la modifier
        </p>
      </div>

      {/* Summary */}
      {result.summary && (
        <div className="card border-gold/15 bg-gold/3">
          <p className="font-dm-sans text-sm text-text-secondary leading-relaxed">{result.summary}</p>
        </div>
      )}

      {/* Missing data warning */}
      {result.missing_data?.length > 0 && (
        <div className="card border-danger/15 bg-danger/3">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <span className="font-dm-sans text-sm font-medium text-danger">Informations manquantes à compléter avant signature</span>
          </div>
          <ul className="space-y-1">
            {result.missing_data.map((item, i) => (
              <li key={i} className="font-dm-sans text-xs text-text-secondary flex items-start gap-2">
                <span className="text-danger mt-0.5">•</span> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Editable clauses */}
      <div className="space-y-3">
        {clauses.map((clause, idx) => (
          <div
            key={clause.clause_number}
            className={`card transition-all ${editingIdx === idx ? 'border-gold/40' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-dm-mono text-xs w-6 flex-shrink-0" style={{ color: 'rgb(var(--gold) / 0.5)' }}>
                  {clause.clause_number}
                </span>
                <h3 className="font-dm-sans text-sm font-semibold text-text-primary">{clause.clause_title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={clause.status} />
                {editingIdx !== idx && (
                  <button
                    onClick={() => startEdit(idx)}
                    title="Modifier cette clause"
                    className="p-1.5 rounded-lg transition-colors text-text-muted hover:text-gold hover:bg-gold/8"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {editingIdx === idx ? (
              <div className="space-y-2">
                <textarea
                  className="input-field w-full text-sm leading-relaxed resize-y"
                  rows={8}
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => commitEdit(idx)}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3" /> Valider la modification
                  </button>
                  <button
                    onClick={() => setEditingIdx(null)}
                    className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <XIcon className="w-3 h-3" /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="font-dm-sans text-sm text-text-secondary leading-relaxed bg-bg-elevated rounded-lg p-4 whitespace-pre-wrap cursor-text hover:bg-bg-elevated/80 transition-colors"
                onClick={() => startEdit(idx)}
              >
                {clause.content || <span className="italic text-text-muted">À compléter…</span>}
              </div>
            )}

            {clause.suggestions?.length > 0 && editingIdx !== idx && (
              <div className="mt-3 space-y-1 border-t border-border-subtle pt-3">
                <p className="font-dm-mono text-xs text-text-muted mb-1">Suggestions IA :</p>
                {clause.suggestions.map((s, i) => (
                  <p key={i} className="font-dm-sans text-xs text-gold/70 flex items-start gap-1.5">
                    <span className="mt-0.5 flex-shrink-0">→</span> {s}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save again at bottom */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <p className="font-dm-mono text-xs text-text-muted">
          {clauses.filter(c => c.content === 'À compléter').length} clause(s) à compléter
        </p>
        <SaveBtn />
      </div>
    </div>
  );
}
