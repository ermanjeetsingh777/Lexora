import { BookStockStatus } from '@core/models/book.models';

/** Strip labels, separators, and non-ISBN characters; keep digits and trailing X. */
export function normalizeIsbn(raw: string): string {
  return raw
    .trim()
    .replace(/^ISBN[-\s]?(10|13)?:?\s*/i, '')
    .replace(/[^0-9X]/gi, '')
    .toUpperCase();
}

/** Returns canonical ISBN-13 when valid, otherwise null. */
export function canonicalizeIsbn(raw: string): string | null {
  const value = normalizeIsbn(raw);
  if (!value) return null;

  if (value.length === 13 && isValidIsbn13(value)) {
    return value;
  }

  if (value.length === 10) {
    if (isValidIsbn10(value)) {
      return isbn10ToIsbn13(value);
    }

    // Accept the last 10 digits of a valid ISBN-13 (978 prefix omitted).
    const asIsbn13 = `978${value}`;
    if (isValidIsbn13(asIsbn13)) {
      return asIsbn13;
    }
  }

  return null;
}

export function isValidIsbn(raw: string): boolean {
  return canonicalizeIsbn(raw) !== null;
}

function isValidIsbn10(value: string): boolean {
  if (!/^\d{9}[\dX]$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (value.charCodeAt(i) - 48) * (10 - i);
  const check = value[9] === 'X' ? 10 : value.charCodeAt(9) - 48;
  return (sum + check) % 11 === 0;
}

function isValidIsbn13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (value.charCodeAt(i) - 48) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return check === (value.charCodeAt(12) - 48);
}

function isbn10ToIsbn13(isbn10: string): string {
  const core = `978${isbn10.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += (core.charCodeAt(i) - 48) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return `${core}${check}`;
}

export function computeBookStatus(available: number, total: number): BookStockStatus {
  if (available <= 0) return BookStockStatus.OutOfStock;
  if (available <= Math.max(2, Math.round(total * 0.25))) return BookStockStatus.LowStock;
  return BookStockStatus.Available;
}

export function bookStatusVariant(status: BookStockStatus): 'success' | 'warning' | 'destructive' {
  if (status === BookStockStatus.Available) return 'success';
  if (status === BookStockStatus.LowStock) return 'warning';
  return 'destructive';
}

export function bookCoverHue(title: string): number {
  return [...title].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;
}

export function bookInitials(title: string): string {
  return title.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
}

export function formatBookDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
