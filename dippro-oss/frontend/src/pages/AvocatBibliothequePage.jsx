import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import AvocatClientShell from '../components/avocat/AvocatClientShell';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { LEGAL_ENTRIES, SANCTIONS, CATEGORIES, searchLegalEntries } from '../lib/legalLibrary';
import { COMPLIANCE_LEVEL_LABEL, SCORE_DISCLAIMER } from '../lib/legalCopy';
import { Search, ExternalLink, ChevronDown, Scale, X, Sparkles, ScrollText, Bell, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORY_TONE = {
  'Socle légal':        'var(--v2-gold)',
  'Code civil':         'rgb(122 184 255)',
  'Jurisprudence':      'rgb(91 216 154)',
  "Champ d'application": 'rgb(241 124 124)',
  'Droit commercial connexe': 'rgb(180 150 255)',
};

const SUGGESTIONS = [
  "Le seuil de quasi-exclusivité de 80 % est-il un critère absolu ?",
  "Quelles sont les conséquences d'une clause de non-concurrence post-contractuelle trop large ?",
  "Le franchiseur doit-il actualiser le DIP entre la remise et la signature ?",
  "Un DIP incomplet entraîne-t-il automatiquement la nullité du contrat ?",
];

function Entry({ entry, expanded, onToggle }) {
  const tone = CATEGORY_TONE[entry.category] || 'var(--v2-gold)';
  return (
    <div className="card-v2">
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-dm-mono text-xs px-2 py-0.5 rounded" style={{ color: tone, border: `1px solid ${tone}`, opacity: 0.85 }}>
                {entry.ref}
              </span>
              <span className="font-dm-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{entry.category}</span>
            </div>
            <p className="font-dm-sans text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{entry.title}</p>
            <p className="font-dm-sans text-xs mt-1 leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>{entry.summary}</p>
          </div>
          <ChevronDown
            className="w-4 h-4 flex-shrink-0 mt-1 transition-transform"
            style={{ color: 'rgb(var(--text-muted))', transform: expanded ? 'rotate(180deg)' : 'none' }}
          />
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid var(--v2-border)' }}>
          {entry.body.map((p, i) => (
            <p key={i} className="font-dm-sans text-sm leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>{p}</p>
          ))}
          {entry.url && (
            <a
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-dm-mono text-xs mt-1"
              style={{ color: 'var(--v2-gold)' }}
            >
              Consulter la source officielle <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// Bandeau de conformité live du client actif — évite un aller-retour vers
// l'onglet Conformité pour la première question que se pose un avocat en
// ouvrant un dossier : "où en est ce DIP, là, maintenant ?"
function ComplianceStrip({ franchiseurId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['compliance-overview', franchiseurId],
    queryFn: () => api.get(`/compliance/overview?franchiseur_id=${franchiseurId}`).then(r => r.data),
  });

  if (isLoading) return <div className="card-v2 flex justify-center py-6"><LoadingSpinner size="sm" /></div>;

  const dip = data?.dip;
  const alerts = data?.alerts?.total ?? 0;
  const delays = data?.signature_delays?.count ?? 0;

  if (!dip) {
    return (
      <div className="card-v2">
        <p className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>Aucun DIP actif pour ce client — le check de conformité s'activera dès qu'un DIP sera importé ou généré.</p>
      </div>
    );
  }

  return (
    <div className="card-v2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mono-label-v2" style={{ marginBottom: 4 }}>Check de conformité — DIP actif</p>
          <p className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
            {COMPLIANCE_LEVEL_LABEL[dip.compliance_level] || 'Non évalué'}
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <p className="display-v2" style={{ fontSize: 26 }}>{dip.conformity_score ?? 0}%</p>
            <p className="font-dm-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>score</p>
          </div>
          {alerts > 0 && (
            <div className="text-center">
              <p className="display-v2 flex items-center gap-1.5 justify-center" style={{ fontSize: 26, color: 'rgb(241 124 124)' }}>
                <Bell className="w-4 h-4" /> {alerts}
              </p>
              <p className="font-dm-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>alertes</p>
            </div>
          )}
          {delays > 0 && (
            <div className="text-center">
              <p className="display-v2 flex items-center gap-1.5 justify-center" style={{ fontSize: 26, color: 'rgb(241 124 124)' }}>
                <Clock className="w-4 h-4" /> {delays}
              </p>
              <p className="font-dm-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>délai 20j</p>
            </div>
          )}
        </div>
      </div>
      <p className="font-dm-sans text-xs mt-3 italic" style={{ color: 'rgb(var(--text-muted))' }}>{SCORE_DISCLAIMER}</p>
    </div>
  );
}

export default function AvocatBibliothequePage() {
  const { franchiseurId } = useParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [expandedId, setExpandedId] = useState(null);
  const [aiHistory, setAiHistory] = useState([]);

  const results = useMemo(() => {
    const found = searchLegalEntries(query);
    return category === 'Toutes' ? found : found.filter(e => e.category === category);
  }, [query, category]);

  const askAiMutation = useMutation({
    mutationFn: (q) => api.post('/avocat/compliance-search', { question: q, franchiseur_id: franchiseurId }).then(r => r.data),
    onSuccess: (data, q) => setAiHistory(h => [{ question: q, answer: data.answer }, ...h]),
    onError: (err) => toast.error(err.message),
  });

  return (
    <AvocatClientShell franchiseurId={franchiseurId} active="bibliotheque">
      <div className="max-w-4xl space-y-6 animate-fade-in">
        <div>
          <p className="mono-label-v2">Outil tout-en-un</p>
          <p className="display-v2" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>Moteur juridique</p>
          <p className="font-dm-sans text-sm mt-2" style={{ color: 'rgb(var(--text-secondary))' }}>
            Recherchez un texte ou un arrêt, posez une question à l'IA, vérifiez la conformité. Les sections
            Socle légal, Code civil et Jurisprudence sont le référentiel appliqué par l'analyse automatique de
            vos clients ; Droit commercial connexe est une bibliothèque de référence complémentaire (non
            encore vérifiée par le moteur IA).
          </p>
        </div>

        <ComplianceStrip franchiseurId={franchiseurId} />

        {/* Recherche — instantanée dans le référentiel, en local */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgb(var(--text-muted))' }} />
          <input
            className="input-field pl-9 pr-9"
            placeholder="Rechercher un article, un arrêt, une notion (ex : prévisionnel, 20 jours, non-concurrence)…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Effacer la recherche">
              <X className="w-4 h-4" style={{ color: 'rgb(var(--text-muted))' }} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {['Toutes', ...CATEGORIES].map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="font-dm-mono text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: category === c ? 'var(--v2-surface-hi)' : 'transparent',
                border: `1px solid ${category === c ? 'var(--v2-border-hot)' : 'var(--v2-border)'}`,
                color: category === c ? 'var(--v2-gold)' : 'rgb(var(--text-secondary))',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <p className="font-dm-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
          {results.length} entrée{results.length !== 1 ? 's' : ''}
          {query && ` pour « ${query} »`}
        </p>

        <div className="space-y-3">
          {results.map(entry => (
            <Entry
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            />
          ))}
          {results.length === 0 && query && (
            <div className="card-v2 text-center py-10">
              <Scale className="w-7 h-7 mx-auto mb-3" style={{ color: 'rgb(var(--text-muted))' }} />
              <p className="font-dm-sans text-sm mb-4" style={{ color: 'rgb(var(--text-secondary))' }}>
                Aucun article du référentiel ne correspond à « {query} ».
              </p>
              <button
                onClick={() => { askAiMutation.mutate(query); }}
                disabled={askAiMutation.isPending}
                className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-dm-sans"
                style={{ border: '1px solid var(--v2-border-hot)', color: 'var(--v2-gold)' }}
              >
                {askAiMutation.isPending ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                Poser la question à l'assistant IA
              </button>
            </div>
          )}
        </div>

        {category === 'Toutes' && !query && (
          <div className="card-v2">
            <p className="mono-label-v2 mb-4">Sanctions — tableau récapitulatif</p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--v2-border)' }}>
                    {['Manquement', 'Sanction', 'Fondement'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-dm-mono text-xs whitespace-nowrap" style={{ color: 'rgb(var(--text-muted))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SANCTIONS.map((s, i) => (
                    <tr key={i} style={{ borderBottom: i < SANCTIONS.length - 1 ? '1px solid var(--v2-border)' : 'none' }}>
                      <td className="px-3 py-2.5 font-dm-sans text-xs" style={{ color: 'rgb(var(--text-primary))' }}>{s.manquement}</td>
                      <td className="px-3 py-2.5 font-dm-sans text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>{s.sanction}</td>
                      <td className="px-3 py-2.5 font-dm-mono text-xs whitespace-nowrap" style={{ color: 'var(--v2-gold)', opacity: 0.8 }}>{s.fondement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Assistant IA — pour les questions qui débordent du référentiel statique
            (application au cas d'espèce, croisement avec le DIP du client actif) */}
        <div className="pt-4" style={{ borderTop: '1px solid var(--v2-border)' }}>
          <p className="mono-label-v2 mb-1">Assistant IA</p>
          <p className="font-dm-sans text-xs mb-4" style={{ color: 'rgb(var(--text-secondary))' }}>
            Pour une question qui déborde du référentiel statique — la réponse s'appuie sur le DIP actif de ce client quand c'est pertinent.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); const q = e.target.elements.aiQuestion.value.trim(); if (q && !askAiMutation.isPending) { askAiMutation.mutate(q); e.target.reset(); } }} className="card-v2">
            <div className="flex items-start gap-3">
              <Search className="w-4 h-4 flex-shrink-0 mt-3" style={{ color: 'var(--v2-gold)' }} />
              <textarea
                name="aiQuestion"
                placeholder="Ex : la clause de non-concurrence de la section 8 est-elle opposable après résiliation ?"
                rows={3}
                maxLength={2000}
                className="input-field resize-none flex-1"
                style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)' }}
              />
            </div>
            <div className="flex items-center justify-end mt-3">
              <button
                type="submit"
                disabled={askAiMutation.isPending}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-dm-sans"
                style={{ border: '1px solid var(--v2-border-hot)', color: 'var(--v2-gold)' }}
              >
                {askAiMutation.isPending ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                Demander à l'IA
              </button>
            </div>
          </form>

          {aiHistory.length === 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => askAiMutation.mutate(s)}
                  className="font-dm-sans text-xs px-3 py-2 rounded-lg text-left transition-colors"
                  style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', color: 'rgb(var(--text-secondary))' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-4 mt-4">
            {aiHistory.map((item, i) => (
              <div key={i} className="card-v2">
                <div className="flex items-start gap-2 mb-3">
                  <ScrollText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--v2-gold)' }} />
                  <p className="font-dm-sans text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{item.question}</p>
                </div>
                <p className="font-dm-sans text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AvocatClientShell>
  );
}
