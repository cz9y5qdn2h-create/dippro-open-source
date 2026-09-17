import { useState } from 'react';
import { Wand2, Sparkles, Check, X } from 'lucide-react';
import api from '../lib/api';
import LoadingSpinner from './ui/LoadingSpinner';
import toast from 'react-hot-toast';

// Widget contextuel "Aide à la rédaction" — le bouton déclencheur reste à
// côté de "Modifier" ; le panneau, une fois ouvert, s'affiche sur sa propre
// ligne pleine largeur (rendu séparément par le parent via `panel`) pour ne
// jamais pousser les autres boutons de la ligne.
export function useAIAssist(apiPath) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [proposedText, setProposedText] = useState(null);

  const reset = () => {
    setOpen(false);
    setQuestions(null);
    setAnswers([]);
    setProposedText(null);
  };

  const start = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const { data } = await api.post(apiPath, {});
      if (data.needs_info) {
        setQuestions(data.questions || []);
        setAnswers((data.questions || []).map(() => ''));
      } else {
        setProposedText(data.corrected_content || '');
      }
    } catch (err) {
      toast.error(err.message || 'Assistant IA indisponible — réessayez');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswers = async () => {
    setLoading(true);
    try {
      const payload = questions.map((q, i) => ({ question: q, answer: answers[i] || '' }));
      const { data } = await api.post(apiPath, { answers: payload });
      setProposedText(data.corrected_content || '');
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la génération — réessayez');
    } finally {
      setLoading(false);
    }
  };

  const setAnswer = (i, v) => setAnswers(a => { const next = [...a]; next[i] = v; return next; });

  return { open, loading, questions, answers, proposedText, start, submitAnswers, setAnswer, reset };
}

export function AIAssistTrigger({ onClick }) {
  return (
    <button onClick={onClick} className="btn-ghost flex items-center gap-2 text-sm text-gold">
      <Wand2 className="w-4 h-4" /> Aide à la rédaction
    </button>
  );
}

export function AIAssistPanel({ state, onApply }) {
  const { loading, questions, answers, proposedText, submitAnswers, setAnswer, reset } = state;

  return (
    <div className="rounded-xl border border-gold/25 bg-gold/5 p-4 space-y-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <span className="font-dm-sans text-sm font-medium text-gold flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Assistant IA
        </span>
        <button onClick={reset} className="text-text-muted hover:text-text-primary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 font-dm-sans text-sm text-text-secondary py-2">
          <LoadingSpinner size="sm" /> Réflexion en cours…
        </div>
      )}

      {!loading && proposedText && (
        <div className="space-y-3">
          <div className="bg-bg-elevated rounded-lg p-3 max-h-56 overflow-y-auto">
            <p className="font-dm-sans text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{proposedText}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onApply(proposedText); reset(); }} className="btn-primary flex items-center gap-2 text-sm py-2">
              <Check className="w-4 h-4" /> Utiliser ce texte
            </button>
            <button onClick={reset} className="btn-ghost text-sm">Annuler</button>
          </div>
        </div>
      )}

      {!loading && !proposedText && questions?.length > 0 && (
        <div className="space-y-3">
          <p className="font-dm-sans text-xs text-text-secondary">
            Répondez pour que l'assistant rédige cette section :
          </p>
          {questions.map((q, i) => (
            <div key={i}>
              <label className="font-dm-sans text-xs text-text-secondary block mb-1">{q}</label>
              <input
                className="input-field text-sm"
                value={answers[i] || ''}
                onChange={e => setAnswer(i, e.target.value)}
              />
            </div>
          ))}
          <button
            onClick={submitAnswers}
            disabled={!answers.some(a => a.trim())}
            className="btn-primary flex items-center gap-2 text-sm py-2"
          >
            <Sparkles className="w-4 h-4" /> Générer le texte
          </button>
        </div>
      )}
    </div>
  );
}
