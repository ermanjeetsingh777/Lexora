// Mock auth provider with localStorage-backed session, seeded role accounts,
// and role/permission helpers. Drop-in replacement for the previous Supabase
// store — exposes the same `useAuth` zustand hook so existing consumers
// (login/register/topbar/_authenticated layout) keep working.
import { create } from "zustand";

export type Role = "admin" | "staff" | "member";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  institution: string;
  branch: string;
}

interface SeededUser extends AuthUser {
  password: string;
}

const PERMISSIONS: Record<Role, string[]> = {
  admin: ["*"],
  staff: [
    "members:read", "members:write",
    "seats:read", "seats:write",
    "attendance:read", "attendance:write",
    "libraries:read",
  ],
  member: ["self:read", "attendance:read"],
};

const SEED: SeededUser[] = [
  {
    id: "u_admin",
    name: "Aarav Sharma",
    email: "admin@demo",
    password: "demo123",
    role: "admin",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Aarav+Sharma&backgroundType=gradientLinear",
    institution: "Meridian Institute",
    branch: "Central Campus",
  },
  {
    id: "u_staff",
    name: "Saanvi Iyer",
    email: "staff@demo",
    password: "demo123",
    role: "staff",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Saanvi+Iyer&backgroundType=gradientLinear",
    institution: "Meridian Institute",
    branch: "North Campus",
  },
  {
    id: "u_member",
    name: "Kabir Khan",
    email: "member@demo",
    password: "demo123",
    role: "member",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Kabir+Khan&backgroundType=gradientLinear",
    institution: "Meridian Institute",
    branch: "Central Campus",
  },
];

const STORAGE_KEY = "mock-auth-session";
const USERS_KEY = "mock-auth-users";

function loadUsers(): SeededUser[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) {
      window.localStorage.setItem(USERS_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as SeededUser[];
  } catch {
    return SEED;
  }
}

function saveUsers(users: SeededUser[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function saveSession(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(STORAGE_KEY);
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: Role) => Promise<void>;
  logout: () => Promise<void>;
  loginAs: (role: Role) => Promise<void>;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  initialized: false,
  login: async (email, password) => {
    await new Promise((r) => setTimeout(r, 150));
    const users = loadUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found) throw new Error("No account with that email");
    if (found.password !== password) throw new Error("Incorrect password");
    const { password: _pw, ...publicUser } = found;
    saveSession(publicUser);
    set({ user: publicUser, isAuthenticated: true, initialized: true });
  },
  register: async (name, email, password, role = "member") => {
    await new Promise((r) => setTimeout(r, 150));
    const users = loadUsers();
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new Error("An account with that email already exists");
    }
    const id = `u_${Date.now().toString(36)}`;
    const newUser: SeededUser = {
      id,
      name,
      email,
      password,
      role,
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear`,
      institution: "Demo Institution",
      branch: "Main Branch",
    };
    saveUsers([...users, newUser]);
    const { password: _pw, ...publicUser } = newUser;
    saveSession(publicUser);
    set({ user: publicUser, isAuthenticated: true, initialized: true });
  },
  logout: async () => {
    saveSession(null);
    set({ user: null, isAuthenticated: false });
  },
  loginAs: async (role) => {
    const seed = SEED.find((u) => u.role === role);
    if (!seed) throw new Error("Unknown role");
    await get().login(seed.email, seed.password);
  },
  hasRole: (role) => get().user?.role === role,
  hasAnyRole: (roles) => {
    const u = get().user;
    return !!u && roles.includes(u.role);
  },
  hasPermission: (permission) => {
    const u = get().user;
    if (!u) return false;
    const list = PERMISSIONS[u.role] ?? [];
    if (list.includes("*")) return true;
    return list.includes(permission);
  },
}));

// Hydrate from localStorage once in the browser.
if (typeof window !== "undefined") {
  const stored = loadSession();
  useAuth.setState({
    user: stored,
    isAuthenticated: !!stored,
    initialized: true,
  });
}

export const SEEDED_ACCOUNTS = SEED.map(({ password, ...rest }) => ({ ...rest, password }));
