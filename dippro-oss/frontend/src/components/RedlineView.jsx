import { useMemo } from 'react';
import { diffWords } from '../lib/textDiff';

// Affiche un diff mot-à-mot façon "suivi des modifications" (Word/notaire) :
// ajouts soulignés, suppressions barrées. Utilisé côté avocat (aperçu live
// pendant la rédaction) et côté franchiseur (relecture d'une proposition).
export default function RedlineView({ before, after, className = '', emptyLabel = 'Aucun contenu' }) {
  const ops = useMemo(() => diffWords(before, after), [before, after]);

  if (!before && !after) {
    return <p className={`italic ${className}`} style={{ color: 'rgb(var(--text-muted))' }}>{emptyLabel}</p>;
  }

  return (
    <p className={`whitespace-pre-wrap leading-relaxed ${className}`}>
      {ops.map((op, i) => {
        if (op.type === 'equal') return <span key={i}>{op.text}</span>;
        if (op.type === 'delete') {
          return (
            <span key={i} style={{ color: 'rgb(var(--danger))', textDecoration: 'line-through', opacity: 0.65 }}>
              {op.text}
            </span>
          );
        }
        return (
          <span key={i} style={{ color: 'rgb(var(--success))', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            {op.text}
          </span>
        );
      })}
    </p>
  );
}
