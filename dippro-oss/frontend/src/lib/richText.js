// Formatage riche léger pour le contenu des sections/clauses — un
// sous-ensemble volontairement restreint de Markdown (gras, italique,
// surlignage, barré, listes à puces) plutôt qu'un éditeur WYSIWYG complet :
// le contenu reste un texte brut lisible tel quel par l'analyse IA, les
// exports et le suivi des modifications (RedlineView), sans les risques
// d'un HTML arbitraire stocké en base.
//
// Marqueurs supportés : **gras**, *italique* (ou _italique_), ==surligné==,
// ~~barré~~, et les lignes commençant par "- " comme puces.

const INLINE_PATTERN = /(\*\*.+?\*\*|==.+?==|~~.+?~~|\*[^*\n]+?\*|_[^_\n]+?_)/g;

function renderInline(text, keyPrefix) {
  const parts = text.split(INLINE_PATTERN).filter(p => p !== '');
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 3) {
      return { type: 'strong', key, text: part.slice(2, -2) };
    }
    if (part.startsWith('==') && part.endsWith('==') && part.length > 3) {
      return { type: 'mark', key, text: part.slice(2, -2) };
    }
    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 3) {
      return { type: 'del', key, text: part.slice(2, -2) };
    }
    if ((part.startsWith('*') && part.endsWith('*') && part.length > 1) ||
        (part.startsWith('_') && part.endsWith('_') && part.length > 1)) {
      return { type: 'em', key, text: part.slice(1, -1) };
    }
    return { type: 'text', key, text: part };
  });
}

// Découpe le texte source en un modèle simple de blocs (paragraphes,
// éléments de liste) chacun porteur de segments inline typés — sert à la
// fois au rendu React (RichTextView) et, si besoin, à un export texte brut.
export function parseRichText(source) {
  const lines = (source || '').split('\n');
  const blocks = [];
  let paragraphLines = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const text = paragraphLines.join('\n');
    blocks.push({ type: 'paragraph', key: `p-${blocks.length}`, segments: renderInline(text, `p-${blocks.length}`) });
    paragraphLines = [];
  };

  let listItems = null;
  const flushList = () => {
    if (!listItems) return;
    blocks.push({ type: 'list', key: `l-${blocks.length}`, items: listItems });
    listItems = null;
  };

  lines.forEach((line, i) => {
    const bullet = /^\s*[-•]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (!listItems) listItems = [];
      listItems.push({ key: `li-${i}`, segments: renderInline(bullet[1], `li-${i}`) });
    } else if (line.trim() === '') {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraphLines.push(line);
    }
  });
  flushParagraph();
  flushList();

  return blocks;
}

// Retire les marqueurs sans les interpréter — utilisé côté export
// (PDF/DOCX) tant qu'ils ne savent pas rendre le formatage riche, pour ne
// jamais laisser échapper un "**mot**" littéral dans un document signé.
export function stripRichTextMarkers(source) {
  return (source || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/==(.+?)==/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1$2')
    .replace(/\b_(.+?)_\b/g, '$1');
}
