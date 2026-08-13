import { TicketDraft } from '@core/models/support.models';

const STORAGE_KEY = 'slms.support.drafts.v1';

export function loadTicketDrafts(): TicketDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TicketDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTicketDrafts(drafts: TicketDraft[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export function upsertTicketDraft(draft: TicketDraft): TicketDraft[] {
  const drafts = loadTicketDrafts().filter(d => d.id !== draft.id);
  drafts.unshift({ ...draft, updatedAt: Date.now() });
  saveTicketDrafts(drafts.slice(0, 10));
  return loadTicketDrafts();
}

export function deleteTicketDraft(id: string): TicketDraft[] {
  const drafts = loadTicketDrafts().filter(d => d.id !== id);
  saveTicketDrafts(drafts);
  return drafts;
}

export function createDraftId(): string {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
