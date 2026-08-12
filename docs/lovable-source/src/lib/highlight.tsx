import { Fragment, type ReactNode } from "react";

export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

export function highlight(text: string, query: string): ReactNode {
  const tokens = tokenize(query);
  if (tokens.length === 0) return text;
  const pattern = new RegExp(
    `(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((p, i) =>
        pattern.test(p) ? (
          <mark key={i} className="rounded bg-primary/25 text-foreground px-0.5">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function scoreMatch(fields: string[], query: string): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;
  let score = 0;
  for (const [i, field] of fields.entries()) {
    const weight = [4, 2, 1][i] ?? 1;
    const f = field.toLowerCase();
    for (const t of tokens) {
      const idx = f.indexOf(t);
      if (idx >= 0) score += weight + (idx === 0 ? 1 : 0);
    }
  }
  return score;
}

export function snippet(text: string, query: string, len = 160): string {
  const tokens = tokenize(query);
  if (tokens.length === 0) return text.slice(0, len) + (text.length > len ? "…" : "");
  const lower = text.toLowerCase();
  let firstIdx = -1;
  for (const t of tokens) {
    const idx = lower.indexOf(t);
    if (idx >= 0 && (firstIdx < 0 || idx < firstIdx)) firstIdx = idx;
  }
  if (firstIdx < 0) return text.slice(0, len) + (text.length > len ? "…" : "");
  const start = Math.max(0, firstIdx - 40);
  const end = Math.min(text.length, start + len);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}
