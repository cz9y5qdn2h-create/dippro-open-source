// Diff mot-à-mot façon "suivi des modifications" — utilisé pour comparer le
// contenu d'origine d'une section/clause à une proposition (avocat) ou à une
// saisie en cours d'édition, et l'afficher en redline (ajouts/suppressions).

function tokenize(text) {
  return (text || '').split(/(\s+)/).filter(Boolean);
}

// Diff par ligne (plus rapide, moins fin) — utilisé en repli si le texte est
// trop long pour que le diff mot-à-mot (O(m*n)) reste instantané.
function diffLines(oldText, newText) {
  return diffTokens((oldText || '').split(/(\n)/).filter(Boolean), (newText || '').split(/(\n)/).filter(Boolean));
}

function diffTokens(oldTokens, newTokens) {
  const m = oldTokens.length;
  const n = newTokens.length;
  const lcs = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = oldTokens[i] === newTokens[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const ops = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (oldTokens[i] === newTokens[j]) {
      ops.push({ type: 'equal', text: oldTokens[i] });
      i++; j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ type: 'delete', text: oldTokens[i] });
      i++;
    } else {
      ops.push({ type: 'insert', text: newTokens[j] });
      j++;
    }
  }
  while (i < m) { ops.push({ type: 'delete', text: oldTokens[i] }); i++; }
  while (j < n) { ops.push({ type: 'insert', text: newTokens[j] }); j++; }

  const merged = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) last.text += op.text;
    else merged.push({ ...op });
  }
  return merged;
}

const WORD_DIFF_BUDGET = 2_000_000; // m*n cells max avant repli sur un diff par ligne

export function diffWords(oldText, newText) {
  if (oldText === newText) return [{ type: 'equal', text: oldText || '' }];

  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);

  if (oldTokens.length * newTokens.length > WORD_DIFF_BUDGET) {
    return diffLines(oldText, newText);
  }

  return diffTokens(oldTokens, newTokens);
}
