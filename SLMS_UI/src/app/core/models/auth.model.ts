export type Role = 'admin' | 'staff' | 'member';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  institution: string;
  branch: string;
}

export interface Token {
  [prop: string]: any;

  access_token: string;
  token_type?: string;
  expires_in?: number;
  exp?: number;
  refresh_token?: string;
}

export interface SeededUser extends AuthUser {
  password: string;
}

export const PERMISSIONS: Record<Role, string[]> = {
  admin: ['*'],
  staff: [
    'members:read', 'members:write',
    'seats:read', 'seats:write',
    'attendance:read', 'attendance:write',
    'libraries:read',
  ],
  member: ['self:read', 'attendance:read'],
};

export const SEED_USERS: SeededUser[] = [
  {
    id: 'u_admin',
    name: 'Aarav Sharma',
    email: 'admin@demo',
    password: 'demo123',
    role: 'admin',
    avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=Aarav+Sharma&backgroundType=gradientLinear',
    institution: 'Meridian Institute',
    branch: 'Central Campus',
  },
  {
    id: 'u_staff',
    name: 'Saanvi Iyer',
    email: 'staff@demo',
    password: 'demo123',
    role: 'staff',
    avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=Saanvi+Iyer&backgroundType=gradientLinear',
    institution: 'Meridian Institute',
    branch: 'North Campus',
  },
  {
    id: 'u_member',
    name: 'Kabir Khan',
    email: 'member@demo',
    password: 'demo123',
    role: 'member',
    avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=Kabir+Khan&backgroundType=gradientLinear',
    institution: 'Meridian Institute',
    branch: 'Central Campus',
  },
];
