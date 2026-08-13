export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map(t => t.trim())
    .filter(Boolean);
}

export function scoreMatch(text: string, tokens: string[]): number {
  if (!tokens.length) return 0;
  const haystack = text.toLowerCase();
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? token.length : 0), 0);
}

export function snippet(text: string, tokens: string[], max = 140): string {
  if (!text) return '';
  if (!tokens.length) return text.slice(0, max) + (text.length > max ? '…' : '');
  const lower = text.toLowerCase();
  const hit = tokens.find(t => lower.includes(t));
  if (!hit) return text.slice(0, max) + (text.length > max ? '…' : '');
  const idx = lower.indexOf(hit);
  const start = Math.max(0, idx - 40);
  const slice = text.slice(start, start + max);
  return (start > 0 ? '…' : '') + slice + (start + max < text.length ? '…' : '');
}

export function highlightText(text: string, tokens: string[]): string {
  if (!tokens.length) return text;
  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
  return text.replace(pattern, '<mark class="bg-warning/30 rounded px-0.5">$1</mark>');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
