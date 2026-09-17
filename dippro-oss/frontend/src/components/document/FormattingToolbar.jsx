import { Bold, Italic, Highlighter, Strikethrough, List } from 'lucide-react';

function ToolbarButton({ icon: Icon, title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-bg-elevated text-text-secondary hover:text-gold transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

// Barre d'outils de mise en forme — insère/enrobe la sélection courante du
// textarea avec les marqueurs légers reconnus par lib/richText.js. Pas de
// contentEditable : plus simple, plus fiable, et le contenu stocké reste un
// texte brut lisible partout ailleurs (IA, exports, suivi des modifications).
export default function FormattingToolbar({ textareaRef, value, onChange }) {
  const wrap = (marker, endMarker = marker) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const hasSelection = end > start;
    const selected = hasSelection ? value.slice(start, end) : 'texte';
    const next = value.slice(0, start) + marker + selected + endMarker + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + marker.length, start + marker.length + selected.length);
    });
  };

  const toggleList = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || 'élément';
    const withBullets = selected.split('\n').map(l => (l.startsWith('- ') ? l : `- ${l}`)).join('\n');
    const next = value.slice(0, start) + withBullets + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start, start + withBullets.length);
    });
  };

  return (
    <div className="flex items-center gap-0.5 mb-1.5 flex-wrap">
      <ToolbarButton icon={Bold} title="Gras" onClick={() => wrap('**')} />
      <ToolbarButton icon={Italic} title="Italique" onClick={() => wrap('*')} />
      <ToolbarButton icon={Highlighter} title="Surligner" onClick={() => wrap('==')} />
      <ToolbarButton icon={Strikethrough} title="Barré" onClick={() => wrap('~~')} />
      <span className="w-px h-4 bg-border-subtle mx-1" />
      <ToolbarButton icon={List} title="Liste à puces" onClick={toggleList} />
    </div>
  );
}
