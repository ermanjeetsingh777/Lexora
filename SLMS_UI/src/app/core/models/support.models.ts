export enum TicketStatus {
  Open = 1,
  InProgress = 2,
  Waiting = 3,
  Resolved = 4,
}

export enum TicketPriority {
  Low = 1,
  Normal = 2,
  High = 3,
  Urgent = 4,
}

export enum TicketCategory {
  Account = 1,
  Billing = 2,
  Technical = 3,
  FeatureRequest = 4,
  Hardware = 5,
  Other = 6,
}

export interface SupportAttachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  downloadUrl: string;
}

export interface SupportTicketMessage {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAtUtc: string;
  attachments: SupportAttachment[];
}

export interface SupportTicketListItem {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  ownerName?: string | null;
  requesterName: string;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  messageCount: number;
}

export interface SupportTicketDetail {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  area?: string | null;
  requesterName: string;
  requesterEmail: string;
  ownerName?: string | null;
  channel: string;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  slaDueAtUtc?: string | null;
  messages: SupportTicketMessage[];
  attachments: SupportAttachment[];
}

export interface CreateSupportTicketRequest {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  area?: string;
  description: string;
  attachmentIds?: string[];
}

export interface AddTicketMessageRequest {
  body: string;
  attachmentIds?: string[];
}

export interface UpdateTicketStatusRequest {
  status: TicketStatus;
  ownerName?: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  category: string;
  tags: string[];
  body: string;
  viewCount: number;
  updatedAtUtc: string;
}

export interface SystemIncidentUpdate {
  id: string;
  phase: string;
  body: string;
  occurredAtUtc: string;
}

export interface SystemIncident {
  id: string;
  title: string;
  severity: string;
  status: string;
  components: string[];
  startedAtUtc: string;
  resolvedAtUtc?: string | null;
  updates: SystemIncidentUpdate[];
}

export interface SystemComponentHealth {
  name: string;
  description: string;
  status: string;
  responseMs: number;
  uptime90: number[];
}

export interface SystemStatus {
  overallStatus: string;
  averageUptime90: number;
  lastSyncUtc: string;
  components: SystemComponentHealth[];
  activeIncidents: SystemIncident[];
  incidentHistory: SystemIncident[];
}

export interface TicketDraft {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  area: string;
  description: string;
  attachmentIds: string[];
  attachmentNames: string[];
  updatedAt: number;
}

export const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: TicketCategory.Account, label: 'Account' },
  { value: TicketCategory.Billing, label: 'Billing' },
  { value: TicketCategory.Technical, label: 'Technical' },
  { value: TicketCategory.FeatureRequest, label: 'Feature request' },
  { value: TicketCategory.Hardware, label: 'Hardware' },
  { value: TicketCategory.Other, label: 'Other' },
];

export const TICKET_PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: TicketPriority.Low, label: 'Low' },
  { value: TicketPriority.Normal, label: 'Normal' },
  { value: TicketPriority.High, label: 'High' },
  { value: TicketPriority.Urgent, label: 'Urgent' },
];

export const TICKET_STATUSES: { value: TicketStatus; label: string }[] = [
  { value: TicketStatus.Open, label: 'Open' },
  { value: TicketStatus.InProgress, label: 'In progress' },
  { value: TicketStatus.Waiting, label: 'Waiting' },
  { value: TicketStatus.Resolved, label: 'Resolved' },
];

export function ticketStatusLabel(status: TicketStatus): string {
  return TICKET_STATUSES.find(s => s.value === status)?.label ?? 'Open';
}

export function ticketPriorityLabel(priority: TicketPriority): string {
  return TICKET_PRIORITIES.find(p => p.value === priority)?.label ?? 'Normal';
}

export function ticketCategoryLabel(category: TicketCategory): string {
  return TICKET_CATEGORIES.find(c => c.value === category)?.label ?? 'Other';
}
