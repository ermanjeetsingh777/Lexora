export function parseUtcIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  if (hasZone) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(`${trimmed}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatAppDateTime(value: string | Date | null | undefined): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '—';
    return value.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  const parsed = parseUtcIso(value);
  if (!parsed) return '—';
  return parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatAppDate(value: string | Date | null | undefined): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '—';
    return value.toLocaleDateString(undefined, { dateStyle: 'medium' });
  }

  const parsed = parseUtcIso(value);
  if (!parsed) return '—';
  return parsed.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function formatAppTime(value: string | Date | null | undefined): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '—';
    return value.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  const parsed = parseUtcIso(value);
  if (!parsed) return '—';
  return parsed.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
