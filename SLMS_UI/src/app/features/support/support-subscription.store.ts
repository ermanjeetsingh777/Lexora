export type StatusSubscriptionChannel = 'email' | 'sms' | 'webhook';

export interface StatusSubscription {
  channel: StatusSubscriptionChannel;
  target: string;
  components: string[];
  createdAt: number;
}

const STORAGE_KEY = 'slms-support-status-subscriptions';

export function loadStatusSubscriptions(): StatusSubscription[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StatusSubscription[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addStatusSubscription(sub: Omit<StatusSubscription, 'createdAt'>): StatusSubscription[] {
  const next: StatusSubscription = { ...sub, createdAt: Date.now() };
  const list = loadStatusSubscriptions().filter(s => s.target !== sub.target);
  list.push(next);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function removeStatusSubscription(target: string): StatusSubscription[] {
  const list = loadStatusSubscriptions().filter(s => s.target !== target);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}
