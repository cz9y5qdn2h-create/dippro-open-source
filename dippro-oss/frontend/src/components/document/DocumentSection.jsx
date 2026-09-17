import { useState, useRef } from 'react';
import { Edit3, Check, X } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import LoadingSpinner from '../ui/LoadingSpinner';
import RedlineView from '../RedlineView';
import RichTextView from './RichTextView';
import FormattingToolbar from './FormattingToolbar';
import { useAIAssist, AIAssistTrigger, AIAssistPanel } from '../AIAssistWidget';

// Une trame du document continu (section de DIP ou clause de contrat) —
// remplace l'accordéon "un seul ouvert à la fois" par un bloc toujours
// visible, éditable sur place, avec suivi des modifications en direct.
export default function DocumentSection({
  id, number, title, status, description, content, lastUpdated,
  aiAssistPath, onSave, isSaving, registerRef,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const textareaRef = useRef(null);
  const aiAssist = useAIAssist(aiAssistPath);

  const startEdit = () => { setIsEditing(true); setEditContent(content || ''); };
  const applyAI = (text) => { setIsEditing(true); setEditContent(text); };

  const save = (status) => {
    onSave(editContent, status)
      .then(() => setIsEditing(false))
      .catch(() => {});
  };

  return (
    <div ref={el => registerRef(id, el)} data-section-id={id} className="card">
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-dm-mono text-sm text-gold/60 w-6 flex-shrink-0">{String(number).padStart(2, '0')}</span>
          <p className="font-dm-sans text-sm text-text-primary font-medium">{title}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {description && (
        <p className="font-dm-sans text-xs text-text-secondary italic mb-3 pl-3 border-l-2 border-border-subtle">{description}</p>
      )}

      {!isEditing ? (
        <div>
          <div className="bg-bg-elevated rounded p-4 mb-4">
            <RichTextView content={content} className="font-dm-sans text-sm text-text-primary leading-relaxed" />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="font-dm-mono text-xs text-text-secondary">
              Mis à jour le {lastUpdated ? new Date(lastUpdated).toLocaleDateString('fr-FR') : 'N/A'}
            </p>
            <div className="flex items-center gap-2">
              <AIAssistTrigger onClick={aiAssist.start} />
              <button onClick={startEdit} className="btn-ghost flex items-center gap-2 text-sm"><Edit3 className="w-4 h-4" /> Modifier</button>
            </div>
          </div>
          {aiAssist.open && (
            <div className="mt-3"><AIAssistPanel state={aiAssist} onApply={applyAI} /></div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <FormattingToolbar textareaRef={textareaRef} value={editContent} onChange={setEditContent} />
            <textarea
              ref={textareaRef}
              className="input-field min-h-48 resize-none font-dm-mono text-sm"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              placeholder="Contenu... — sélectionnez du texte puis utilisez la barre d'outils pour le mettre en forme"
              autoFocus
            />
          </div>

          <div>
            <p className="font-dm-mono text-[11px] text-text-muted uppercase tracking-wider mb-1.5">Aperçu</p>
            <div className="bg-bg-elevated rounded-lg p-3 min-h-[60px]">
              <RichTextView content={editContent} className="font-dm-sans text-sm text-text-primary" emptyLabel="Commencez à rédiger pour voir l'aperçu." />
            </div>
          </div>

          <div>
            <p className="font-dm-mono text-[11px] text-text-muted uppercase tracking-wider mb-1.5">Suivi des modifications</p>
            <div className="bg-bg-elevated rounded-lg p-3 min-h-[60px]">
              <RedlineView before={content || ''} after={editContent} className="font-dm-sans text-sm" emptyLabel="Commencez à rédiger pour voir l'aperçu." />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => save('conforme')} disabled={isSaving} className="btn-primary flex items-center gap-2 text-sm py-2">
              {isSaving ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4" />} Valider comme conforme
            </button>
            <button onClick={() => save('a_verifier')} disabled={isSaving} className="btn-secondary flex items-center gap-2 text-sm py-2">Enregistrer</button>
            <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 text-sm font-dm-sans px-3 py-2 text-text-secondary hover:text-text-primary transition-colors">
              <X className="w-4 h-4" /> Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
