const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  members: 'Members',
  seats: 'Seats',
  attendance: 'Attendance',
  institutions: 'Institutions',
  branches: 'Branches',
  libraries: 'Libraries',
  subscriptions: 'Subscriptions',
  payments: 'Payments',
  books: 'Books',
  inventory: 'Inventory',
  users: 'Users',
  roles: 'Roles',
  reports: 'Reports',
  notifications: 'Notifications',
  profile: 'Profile',
  settings: 'Settings',
  support: 'Support',
};

export function formatRoleName(role: string): string {
  return role
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
}

export function moduleLabel(module: string): string {
  return MODULE_LABELS[module.toLowerCase()] ?? module.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function permissionActionLabel(code: string): string {
  const action = code.split('.').pop() ?? code;
  switch (action) {
    case 'view': return 'View';
    case 'list': return 'List';
    case 'create': return 'Create';
    case 'edit': return 'Edit';
    case 'update': return 'Update';
    case 'delete': return 'Delete';
    case 'use': return 'Use';
    default: return action.charAt(0).toUpperCase() + action.slice(1);
  }
}

export function accessSummaryText(institutions: number, branches: number, libraries: number): string {
  const parts: string[] = [];
  if (institutions) parts.push(`${institutions} institution${institutions === 1 ? '' : 's'}`);
  if (branches) parts.push(`${branches} branch${branches === 1 ? '' : 'es'}`);
  if (libraries) parts.push(`${libraries} librar${libraries === 1 ? 'y' : 'ies'}`);
  if (!parts.length) return 'No mapped workspace yet.';
  if (parts.length === 1) return `You can work across ${parts[0]}.`;
  return `You can work across ${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}.`;
}
