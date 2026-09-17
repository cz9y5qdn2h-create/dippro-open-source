import { parseRichText } from '../../lib/richText';

function Segment({ seg }) {
  switch (seg.type) {
    case 'strong': return <strong>{seg.text}</strong>;
    case 'em': return <em>{seg.text}</em>;
    case 'del': return <del>{seg.text}</del>;
    case 'mark': return <mark style={{ background: 'rgba(156,65,65,0.35)', color: 'inherit', borderRadius: 2, padding: '0 2px' }}>{seg.text}</mark>;
    default: return seg.text;
  }
}

// Rend le sous-ensemble de formatage riche produit par FormattingToolbar
// (gras/italique/surlignage/barré/listes) — voir lib/richText.js pour le
// détail des marqueurs supportés et pourquoi ce n'est pas du HTML libre.
export default function RichTextView({ content, className = '', emptyLabel = 'Non renseigné', style }) {
  if (!content?.trim()) {
    return <span className={`italic ${className}`} style={{ color: 'rgb(var(--text-muted))' }}>{emptyLabel}</span>;
  }

  const blocks = parseRichText(content);

  return (
    <div className={className} style={style}>
      {blocks.map(block => {
        if (block.type === 'list') {
          return (
            <ul key={block.key} style={{ margin: '0 0 0.75em', paddingLeft: '1.25em', listStyle: 'disc' }}>
              {block.items.map(item => (
                <li key={item.key} style={{ marginBottom: '0.25em' }}>
                  {item.segments.map(seg => <Segment key={seg.key} seg={seg} />)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={block.key} className="whitespace-pre-wrap" style={{ margin: '0 0 0.75em' }}>
            {block.segments.map(seg => <Segment key={seg.key} seg={seg} />)}
          </p>
        );
      })}
    </div>
  );
}
