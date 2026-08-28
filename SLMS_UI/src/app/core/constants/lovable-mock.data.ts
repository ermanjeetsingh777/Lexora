// Centralized typed mock data. Swap to real APIs by replacing this file.

export type SeatStatus = "available" | "occupied" | "reserved" | "maintenance";
export type MemberStatus = "Active" | "Inactive" | "Suspended";
export type Shift = "Morning" | "Afternoon" | "Evening" | "Night";

export type InstitutionOnboardingStep =
  | 'Registration'
  | 'Profile'
  | 'Branding'
  | 'Contacts'
  | 'Licenses'
  | 'Subscription'
  | 'Customization'
  | 'EmailTemplates'
  | 'Complete';

export type InstitutionContact = {
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  country: string;
};

export type InstitutionLicense = {
  id: string;
  name: string;
  seatsIncluded: number;
  branchIncluded: number;
  libraryIncluded: number;
  expiresOn: string; // YYYY-MM-DD
  status: 'Active' | 'Expired' | 'Pending';
};

export type InstitutionEmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  lastUpdated: string; // YYYY-MM-DD
};

export type InstitutionBranding = {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  theme: 'Light' | 'Dark';
};

export type InstitutionCustomization = {
  brandNameDisplay: boolean;
  studentPortalEnabled: boolean;
  whatsappNotificationsEnabled: boolean;
  customFooterText: string;
};

export interface Institution {
  id: string;
  name: string;
  type: "School" | "College" | "Library" | "CoachingCenter";

  city: string;
  country: string;

  branches: number;
  members: number;
  revenueMTD: number;
  occupancy: number;
  status: "Active" | "Inactive" | "Pending" | "Suspended";

  // FR-2.1.1..FR-2.1.10
  onboardingStatus: {
    currentStep: InstitutionOnboardingStep;
    completedSteps: InstitutionOnboardingStep[];
  };

  branding: InstitutionBranding;
  contact: InstitutionContact;
  licenses: InstitutionLicense[];
  subscriptionPlans: SubscriptionPlan[];
  selectedPlanId: string;
  customization: InstitutionCustomization;
  emailTemplates: InstitutionEmailTemplate[];

  deactivatedAt?: string; // YYYY-MM-DD
  deactivationReason?: string;
}

export interface StatCard {
  title: string;
  value: string | number;
  icon: string;
}

export type BranchOperationalHours = {
  // simple weekly model
  days: { day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'; open: string; close: string }[];
};

export type GeoLocation = { latitude: number; longitude: number };

export type BranchStaffAssignment = {
  id: string;
  name: string;
  role: 'BranchAdmin' | 'BranchManager' | 'Teacher' | 'SupportStaff';
  email: string;
};

export type BranchHierarchyNode = {
  id: string;
  label: string;
  children?: BranchHierarchyNode[];
};

export interface BranchPerformanceMetrics {
  occupancyNow: number; // %
  utilizationWeekAvg: number; // %
  memberGrowth30d: number; // +/-%
  ticketsOpen: number;
}

export interface Branch {
  id: string;
  institutionId: string;
  name: string;

  city: string;

  capacity: number;
  occupancy: number;
  libraries: number;
  members: number;

  // FR-2.2.1..FR-2.2.10
  profile: {
    description: string;
    websiteUrl?: string;
  };
  contact: {
    email: string;
    phone: string;
  };
  location: GeoLocation;
  operationalHours: BranchOperationalHours;
  performanceMetrics: BranchPerformanceMetrics;
  staffAssignments: BranchStaffAssignment[];
  hierarchy: BranchHierarchyNode;

  deactivatedAt?: string; // YYYY-MM-DD
  deactivationReason?: string;
}

export interface LibraryLayoutSection {
  id: string;
  name: string;
  capacity: number;
};

export type LibraryResourceItem = {
  id: string;
  name: string;
  type: 'BookCopies' | 'StudyRooms' | 'DigitalStations';
  quantity: number;
};

export interface LibraryHours {
  days: { day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'; open: string; close: string }[];
}

export interface LibraryStaffAssignment {
  id: string;
  name: string;
  role: 'LibrarianAdmin' | 'LibrarianManager' | 'Librarian';
  email: string;
}

export interface LibraryUtilizationMetrics {
  utilizationNow: number; // %
  peakUsageHour: string;
  checkoutsToday: number;
  availableSeats: number;
}

export interface LibraryLicense {
  id: string;
  name: string;
  expiresOn: string;
  status: 'Active' | 'Expired' | 'Pending';
};

export interface Library {
  id: string;
  branchId: string;
  name: string;

  floor: number;
  capacity: number;
  occupied: number;

  // FR-2.3.1..FR-2.3.10
  layout: {
    floors: number[];
    sections: LibraryLayoutSection[];
  };
  operationalHours: LibraryHours;
  resources: LibraryResourceItem[];
  licenses: LibraryLicense[];
  utilizationMetrics: LibraryUtilizationMetrics;
  staffAssignments: LibraryStaffAssignment[];

  deactivatedAt?: string;
  deactivationReason?: string;
}


export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: MemberStatus;
  shift: Shift;
  seatNumber: string | null;
  joinDate: string;
  institution: string;
  branch: string;
  library: string;
  plan: string;
  feesOwed: number;
  avatar: string;
}

export interface Seat {
  id: string;
  number: string;
  row: number;
  col: number;
  section: string;
  floor: number;
  status: SeatStatus;
  memberId: string | null;
  memberName: string | null;
  type: "Standard" | "Premium" | "Accessibility";
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "destructive";
  timestamp: string;
  read: boolean;
  channel: "InApp" | "Email" | "SMS" | "Push";
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  billingCycle: "Monthly" | "Quarterly" | "Annually";
  price: number;
  features: string[];
  maxMembers: number;
  maxSeats: number;
}

export interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  status: "Paid" | "Pending" | "Failed" | "Refunded";
  method: "Card" | "UPI" | "Cash" | "Bank";
  date: string;
  invoiceId: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  copies: number;
  available: number;
  status: "Available" | "LowStock" | "OutOfStock";
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Locked" | "Inactive";
  lastLogin: string;
}

export interface Ticket {
  id: string;
  subject: string;
  status: "Open" | "Pending" | "Resolved";
  priority: "Low" | "Medium" | "High";
  updated: string;
  category: string;
}

// --- Generators ---

const FIRST = ["Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Krishna","Ishaan","Rudra","Ananya","Aadhya","Diya","Saanvi","Myra","Aanya","Pari","Anika","Navya","Riya","Kabir","Aryan","Kavya","Ira","Zoya","Zayn","Eshan","Niharika","Tara","Veer"];
const LAST = ["Sharma","Verma","Patel","Iyer","Reddy","Khan","Singh","Kapoor","Gupta","Mehta","Joshi","Bansal","Nair","Pillai","Das","Bose","Roy","Ghosh","Menon","Chowdhury"];

function pick<T>(arr: T[], i: number) { return arr[i % arr.length]; }
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const DEFAULT_ONBOARDING: Institution['onboardingStatus'] = {
  currentStep: 'Complete',
  completedSteps: ['Registration', 'Profile', 'Branding', 'Contacts', 'Licenses', 'Subscription', 'Customization', 'EmailTemplates', 'Complete'],
};

function makeBranding(seed: number): InstitutionBranding {
  const themes: Array<'Light' | 'Dark'> = ['Light', 'Dark'];
  const primary = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#dc2626'][seed % 5];
  const secondary = ['#93c5fd', '#c4b5fd', '#7dd3fc', '#86efac', '#fca5a5'][(seed + 2) % 5];
  return {
    logoUrl: `https://api.dicebear.com/9.x/initials/svg?seed=inst_${seed}&backgroundType=gradientLinear`,
    primaryColor: primary,
    secondaryColor: secondary,
    theme: themes[seed % themes.length],
  };
}

function makeContact(nameSeed: number, city: string, country: string): InstitutionContact {
  const emailDomain = ['meridian.edu', 'brightline.org', 'northpoint.edu', 'polaris.in', 'cascade.edu'][nameSeed % 5];
  return {
    email: `admin+${nameSeed}@${emailDomain}`,
    phone: `+91 9${Math.floor(100000000 + nameSeed * 1234567)}`,
    addressLine1: `${10 + nameSeed} Central Avenue`,
    addressLine2: nameSeed % 2 === 0 ? 'Sector 9' : undefined,
    city,
    country,
  };
}

function makeLicenses(seed: number): InstitutionLicense[] {
  const base = seed % 3;
  return [
    {
      id: `lic_${seed}_1`,
      name: ['SLMS Core', 'SLMS Education', 'SLMS Enterprise'][base % 3],
      seatsIncluded: 1000 + seed * 50,
      branchIncluded: 10 + (seed % 5),
      libraryIncluded: 20 + (seed % 7),
      expiresOn: new Date(2026, 6 + (seed % 3), 15).toISOString().slice(0, 10),
      status: seed % 6 === 0 ? 'Expired' : seed % 6 === 1 ? 'Pending' : 'Active',
    },
  ];
}

function makeEmailTemplates(seed: number): InstitutionEmailTemplate[] {
  const templates = [
    {
      id: `tpl_${seed}_1`,
      name: 'Welcome email',
      subject: 'Welcome to SmartLibrary',
      body: 'Hi {{memberName}}, your onboarding is complete. Explore your library dashboard.',
      lastUpdated: new Date(2025, 3 + (seed % 6), 12).toISOString().slice(0, 10),
    },
    {
      id: `tpl_${seed}_2`,
      name: 'Fee reminder',
      subject: 'Reminder: Fees pending',
      body: 'Hi {{memberName}}, this is a reminder that your dues are pending. Please pay to continue library access.',
      lastUpdated: new Date(2025, 8 + (seed % 3), 3).toISOString().slice(0, 10),
    },
  ];
  return templates;
}

function makeCustomization(seed: number): InstitutionCustomization {
  return {
    brandNameDisplay: seed % 2 === 0,
    studentPortalEnabled: true,
    whatsappNotificationsEnabled: seed % 3 !== 0,
    customFooterText: seed % 2 === 0 ? '© {{year}} SmartLibrary · All rights reserved.' : 'Powered by SmartLibrary (SLMS)',
  };
}

export const institutions: Institution[] = [
  {
    id: 'inst_001',
    name: 'Lexora Institute',
    type: 'College',
    city: 'Bengaluru',
    country: 'India',
    branches: 4,
    members: 1280,
    revenueMTD: 482000,
    occupancy: 78,
    status: 'Active',
    onboardingStatus: DEFAULT_ONBOARDING,
    branding: makeBranding(1),
    contact: makeContact(1, 'Bengaluru', 'India'),
    licenses: makeLicenses(1),
    subscriptionPlans: [],
    selectedPlanId: 'p_growth',
    customization: makeCustomization(1),
    emailTemplates: makeEmailTemplates(1),
  },
  {
    id: 'inst_002',
    name: 'Northpoint Academy',
    type: 'CoachingCenter',
    city: 'Mumbai',
    country: 'India',
    branches: 3,
    members: 940,
    revenueMTD: 316500,
    occupancy: 65,
    status: 'Active',
    onboardingStatus: DEFAULT_ONBOARDING,
    branding: makeBranding(2),
    contact: makeContact(2, 'Mumbai', 'India'),
    licenses: makeLicenses(2),
    subscriptionPlans: [],
    selectedPlanId: 'p_starter',
    customization: makeCustomization(2),
    emailTemplates: makeEmailTemplates(2),
  },
  {
    id: 'inst_003',
    name: 'Brightline Library',
    type: 'Library',
    city: 'Delhi',
    country: 'India',
    branches: 6,
    members: 2104,
    revenueMTD: 612300,
    occupancy: 84,
    status: 'Active',
    onboardingStatus: DEFAULT_ONBOARDING,
    branding: makeBranding(3),
    contact: makeContact(3, 'Delhi', 'India'),
    licenses: makeLicenses(3),
    subscriptionPlans: [],
    selectedPlanId: 'p_pro',
    customization: makeCustomization(3),
    emailTemplates: makeEmailTemplates(3),
  },
  {
    id: 'inst_004',
    name: 'Polaris Study Hub',
    type: 'CoachingCenter',
    city: 'Hyderabad',
    country: 'India',
    branches: 2,
    members: 510,
    revenueMTD: 184200,
    occupancy: 71,
    status: 'Active',
    onboardingStatus: DEFAULT_ONBOARDING,
    branding: makeBranding(4),
    contact: makeContact(4, 'Hyderabad', 'India'),
    licenses: makeLicenses(4),
    subscriptionPlans: [],
    selectedPlanId: 'p_growth',
    customization: makeCustomization(4),
    emailTemplates: makeEmailTemplates(4),
  },
  {
    id: 'inst_005',
    name: 'Cascade Learning',
    type: 'School',
    city: 'Pune',
    country: 'India',
    branches: 5,
    members: 1620,
    revenueMTD: 528700,
    occupancy: 69,
    status: 'Inactive',
    onboardingStatus: {
      currentStep: 'EmailTemplates',
      completedSteps: ['Registration', 'Profile', 'Branding', 'Contacts', 'Licenses', 'Subscription', 'Customization', 'EmailTemplates'],
    },
    branding: makeBranding(5),
    contact: makeContact(5, 'Pune', 'India'),
    licenses: makeLicenses(5),
    subscriptionPlans: [],
    selectedPlanId: 'p_enterprise',
    customization: makeCustomization(5),
    emailTemplates: makeEmailTemplates(5),
    deactivatedAt: '2026-01-15',
    deactivationReason: 'Subscription lapsed',
  },
];

function makeOperationalHours(seed: number): BranchOperationalHours {
  const baseOpen = 8 + (seed % 3);
  return {
    days: [
      { day: 'Mon', open: `${baseOpen}:00`, close: `${baseOpen + 6}:00` },
      { day: 'Tue', open: `${baseOpen}:00`, close: `${baseOpen + 6}:00` },
      { day: 'Wed', open: `${baseOpen}:00`, close: `${baseOpen + 6}:00` },
      { day: 'Thu', open: `${baseOpen}:00`, close: `${baseOpen + 6}:00` },
      { day: 'Fri', open: `${baseOpen}:00`, close: `${baseOpen + 6}:00` },
      { day: 'Sat', open: `${baseOpen}:30`, close: `${baseOpen + 4}:30` },
      { day: 'Sun', open: '10:00', close: '14:00' },
    ],
  };
}

function makeBranchStaff(seed: number): BranchStaffAssignment[] {
  return [
    {
      id: `st_br_${seed}_1`,
      name: ['Aarav Sharma', 'Saanvi Iyer', 'Kabir Khan', 'Riya Patel'][seed % 4],
      role: seed % 2 === 0 ? 'BranchAdmin' : 'BranchManager',
      email: `staff+${seed}@branch.example.com`,
    },
    {
      id: `st_br_${seed}_2`,
      name: ['Vihaan Joshi', 'Ishaan Reddy'][seed % 2],
      role: 'SupportStaff',
      email: `support+${seed}@branch.example.com`,
    },
  ];
}

function makeBranchHierarchy(seed: number): BranchHierarchyNode {
  return {
    id: `hier_${seed}`,
    label: seed % 2 === 0 ? 'Campus HQ' : 'Region Node',
    children: [
      { id: `hier_${seed}_a`, label: 'Level 1 Unit' },
      { id: `hier_${seed}_b`, label: 'Level 2 Unit', children: [{ id: `hier_${seed}_b1`, label: 'Sub Unit' }] },
    ],
  };
}

export const branches: Branch[] = institutions.flatMap((inst, instIdx) =>
  Array.from({ length: inst.branches }, (_, i) => {
    const seed = instIdx * 10 + i + 1;
    const capacity = 120 + i * 40;
    const occupancy = 40 + Math.round(Math.random() * 50);
    const librariesCount = 2 + (i % 3);
    return {
      id: `${inst.id}_br_${i + 1}`,
      institutionId: inst.id,
      name: `${inst.name} — ${['Central','North','South','East','West','Tech Park'][i]} Campus`,
      city: inst.city,
      capacity,
      occupancy,
      libraries: librariesCount,
      members: 180 + i * 60,
      profile: {
        description: `Primary operations campus for ${inst.name}. Focused on member onboarding and branch KPIs.`,
        websiteUrl: `https://example.com/${inst.id}/${i + 1}`,
      },
      contact: {
        email: `branch-admin+${seed}@${inst.name.toLowerCase().replace(/\s+/g,'')}.edu`,
        phone: `+91 8${Math.floor(10000000 + seed * 12345)}`,
      },
      location: {
        latitude: 12.9 + (seed % 10) * 0.12,
        longitude: 77.5 + (seed % 10) * 0.08,
      },
      operationalHours: makeOperationalHours(seed),
      performanceMetrics: {
        occupancyNow: occupancy,
        utilizationWeekAvg: Math.max(20, Math.min(99, occupancy + (seed % 9) - 3)),
        memberGrowth30d: Math.round(((seed % 7) - 2) * 3),
        ticketsOpen: seed % 5,
      },
      staffAssignments: makeBranchStaff(seed),
      hierarchy: makeBranchHierarchy(seed),
    };
  })
);

function makeLibraryHours(seed: number): LibraryHours {
  const baseOpen = 9 + (seed % 3);
  return {
    days: [
      { day: 'Mon', open: `${baseOpen}:00`, close: `${baseOpen + 7}:00` },
      { day: 'Tue', open: `${baseOpen}:00`, close: `${baseOpen + 7}:00` },
      { day: 'Wed', open: `${baseOpen}:00`, close: `${baseOpen + 7}:00` },
      { day: 'Thu', open: `${baseOpen}:00`, close: `${baseOpen + 7}:00` },
      { day: 'Fri', open: `${baseOpen}:00`, close: `${baseOpen + 7}:00` },
      { day: 'Sat', open: `${baseOpen}:30`, close: `${baseOpen + 5}:30` },
      { day: 'Sun', open: '10:00', close: '16:00' },
    ],
  };
}

function makeLibraryStaff(seed: number): LibraryStaffAssignment[] {
  return [
    {
      id: `libst_${seed}_1`,
      name: ['Kabir Khan', 'Saanvi Iyer', 'Diya Nair'][seed % 3],
      role: 'LibrarianAdmin',
      email: `librarian-admin+${seed}@lib.example.com`,
    },
    {
      id: `libst_${seed}_2`,
      name: ['Riya Patel', 'Vihaan Joshi'][seed % 2],
      role: 'Librarian',
      email: `librarian+${seed}@lib.example.com`,
    },
  ];
}

function makeLibraryUtilization(seed: number, capacity: number, occupied: number): LibraryUtilizationMetrics {
  return {
    utilizationNow: Math.round((occupied / Math.max(1, capacity)) * 100),
    peakUsageHour: ['10:00', '12:00', '15:00', '17:00'][seed % 4],
    checkoutsToday: 20 + (seed % 18),
    availableSeats: Math.max(0, capacity - occupied),
  };
}

export const libraries: Library[] = branches.flatMap((br, brIdx) =>
  Array.from({ length: br.libraries }, (_, i) => {
    const seed = brIdx * 10 + i + 1;
    const floor = i + 1;
    const capacity = 60 + i * 20;
    const occupied = 30 + Math.round(Math.random() * 50);
    const librariesNames = ['Main','Quiet Study','Reference','Digital','Reading'];
    return {
      id: `${br.id}_lib_${i + 1}`,
      branchId: br.id,
      name: `${librariesNames[i] ?? 'Hall'} Library`,
      floor,
      capacity,
      occupied,
      layout: {
        floors: [floor],
        sections: [
          { id: `sec_${seed}_1`, name: 'General', capacity: Math.round(capacity * 0.45) },
          { id: `sec_${seed}_2`, name: 'Reference', capacity: Math.round(capacity * 0.35) },
          { id: `sec_${seed}_3`, name: 'Digital', capacity: Math.round(capacity * 0.2) },
        ],
      },
      operationalHours: makeLibraryHours(seed),
      resources: [
        { id: `res_${seed}_1`, name: 'Books (Copies)', type: 'BookCopies', quantity: 1000 + seed * 23 },
        { id: `res_${seed}_2`, name: 'Study Rooms', type: 'StudyRooms', quantity: 8 + (seed % 5) },
        { id: `res_${seed}_3`, name: 'Digital Stations', type: 'DigitalStations', quantity: 20 + (seed % 10) },
      ],
      licenses: [
        { id: `llib_${seed}_lic_1`, name: 'Library Suite', expiresOn: new Date(2026, 9, 20).toISOString().slice(0, 10), status: 'Active' },
      ],
      utilizationMetrics: makeLibraryUtilization(seed, capacity, occupied),
      staffAssignments: makeLibraryStaff(seed),
    };
  })
);


export const members: Member[] = Array.from({ length: 64 }, (_, i) => {
  const r = rng(i + 7);
  const first = pick(FIRST, Math.floor(r() * 30));
  const last = pick(LAST, Math.floor(r() * 20));
  const statusRoll = r();
  const status: MemberStatus = statusRoll > 0.85 ? "Suspended" : statusRoll > 0.7 ? "Inactive" : "Active";
  const shift = (["Morning", "Afternoon", "Evening", "Night"] as Shift[])[i % 4];
  return {
    id: `mem_${String(i + 1).padStart(4, "0")}`,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${["meridian.edu","brightline.org","polaris.in","northpoint.edu"][i % 4]}`,
    phone: `+91 9${Math.floor(100000000 + r() * 899999999)}`,
    status,
    shift,
    seatNumber: status === "Active" ? `${["A","B","C","D"][i % 4]}-${String((i % 24) + 1).padStart(2, "0")}` : null,
    joinDate: new Date(2024, (i % 12), (i % 27) + 1).toISOString().slice(0, 10),
    institution: pick(institutions, i).name,
    branch: pick(branches, i).name,
    library: pick(libraries, i).name,
    plan: ["Annual Pro", "Quarterly", "Monthly", "Annual"][i % 4],
    feesOwed: status !== "Active" ? Math.round(r() * 8000) : 0,
    avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${first}+${last}&backgroundType=gradientLinear`,
  };
});

export function generateSeats(floor = 1, count = 60): Seat[] {
  const cols = 10;
  const sections = ["A", "B", "C", "D"];
  return Array.from({ length: count }, (_, i) => {
    const r = rng(floor * 1000 + i);
    const row = Math.floor(i / cols) + 1;
    const col = (i % cols) + 1;
    const roll = r();
    const status: SeatStatus =
      roll > 0.88 ? "maintenance" : roll > 0.72 ? "reserved" : roll > 0.32 ? "occupied" : "available";
    const memberIdx = Math.floor(r() * members.length);
    const m = members[memberIdx];
    const section = sections[Math.floor(i / (count / sections.length))];
    return {
      id: `f${floor}_s${i + 1}`,
      number: `${section}-${String(i + 1).padStart(2, "0")}`,
      row, col, section, floor, status,
      memberId: status === "occupied" || status === "reserved" ? m.id : null,
      memberName: status === "occupied" || status === "reserved" ? m.name : null,
      type: i % 13 === 0 ? "Accessibility" : i % 7 === 0 ? "Premium" : "Standard",
    };
  });
}

export const seats = generateSeats(1, 60);

export const notifications: Notification[] = [
  { id: "n1", title: "Fee reminder", message: "12 members have pending dues this week.", type: "warning", timestamp: "2m ago", read: false, channel: "InApp" },
  { id: "n2", title: "Seat A-14 reassigned", message: "Aarav Sharma moved to evening shift.", type: "info", timestamp: "18m ago", read: false, channel: "InApp" },
  { id: "n3", title: "Subscription renewed", message: "₹4,82,000 collected in renewals today.", type: "success", timestamp: "1h ago", read: true, channel: "Email" },
  { id: "n4", title: "Late arrival spike", message: "Morning shift late arrivals up 12%.", type: "destructive", timestamp: "3h ago", read: true, channel: "InApp" },
  { id: "n5", title: "Branch capacity 92%", message: "Brightline — South Campus nearing capacity.", type: "warning", timestamp: "Yesterday", read: true, channel: "Push" },
  { id: "n6", title: "Backup completed", message: "Nightly backup completed in 4m 12s.", type: "success", timestamp: "Yesterday", read: true, channel: "InApp" },
];

export const plans: SubscriptionPlan[] = [
  { id: "p_starter", name: "Starter", billingCycle: "Monthly", price: 1499, features: ["Up to 100 members","1 library","Email support"], maxMembers: 100, maxSeats: 80 },
  { id: "p_growth", name: "Growth", billingCycle: "Quarterly", price: 11999, features: ["Up to 500 members","3 libraries","Priority support","Analytics"], maxMembers: 500, maxSeats: 400 },
  { id: "p_pro", name: "Professional", billingCycle: "Annually", price: 39999, features: ["Up to 2,000 members","Unlimited libraries","Dedicated support","Advanced analytics","API access"], maxMembers: 2000, maxSeats: 1800 },
  { id: "p_enterprise", name: "Enterprise", billingCycle: "Annually", price: 119999, features: ["Unlimited members","Multi-tenant","SSO","Custom integrations","24/7 support"], maxMembers: 99999, maxSeats: 99999 },
];

export const payments: Payment[] = members.slice(0, 24).map((m, i) => ({
  id: `pay_${String(i + 1).padStart(4, "0")}`,
  memberId: m.id,
  memberName: m.name,
  amount: [1499, 3999, 11999, 999][i % 4],
  status: (["Paid", "Paid", "Pending", "Paid", "Failed", "Refunded"] as const)[i % 6],
  method: (["Card", "UPI", "Bank", "Cash"] as const)[i % 4],
  date: new Date(2025, 4, (i % 28) + 1).toISOString().slice(0, 10),
  invoiceId: `INV-2025-${String(1000 + i)}`,
}));

export const books: Book[] = [
  { id: "bk_1", title: "Atomic Habits", author: "James Clear", category: "Self-help", isbn: "9780735211292", copies: 12, available: 4, status: "LowStock" },
  { id: "bk_2", title: "Deep Work", author: "Cal Newport", category: "Productivity", isbn: "9781455586691", copies: 8, available: 0, status: "OutOfStock" },
  { id: "bk_3", title: "Clean Code", author: "Robert C. Martin", category: "Engineering", isbn: "9780132350884", copies: 15, available: 11, status: "Available" },
  { id: "bk_4", title: "The Pragmatic Programmer", author: "D. Thomas", category: "Engineering", isbn: "9780201616224", copies: 10, available: 7, status: "Available" },
  { id: "bk_5", title: "Sapiens", author: "Yuval Noah Harari", category: "History", isbn: "9780062316097", copies: 14, available: 2, status: "LowStock" },
  { id: "bk_6", title: "Thinking, Fast and Slow", author: "Daniel Kahneman", category: "Psychology", isbn: "9780374533557", copies: 9, available: 6, status: "Available" },
  { id: "bk_7", title: "Designing Data-Intensive Apps", author: "Martin Kleppmann", category: "Engineering", isbn: "9781449373320", copies: 6, available: 1, status: "LowStock" },
  { id: "bk_8", title: "Educated", author: "Tara Westover", category: "Memoir", isbn: "9780399590504", copies: 11, available: 8, status: "Available" },
];

export const userAccounts: UserAccount[] = [
  { id: "u_1", name: "Aarav Sharma", email: "aarav@meridian.edu", role: "InstitutionAdmin", status: "Active", lastLogin: "5m ago" },
  { id: "u_2", name: "Saanvi Iyer", email: "saanvi@meridian.edu", role: "BranchAdmin", status: "Active", lastLogin: "32m ago" },
  { id: "u_3", name: "Kabir Khan", email: "kabir@brightline.org", role: "LibrarianAdmin", status: "Active", lastLogin: "2h ago" },
  { id: "u_4", name: "Riya Patel", email: "riya@northpoint.edu", role: "Librarian", status: "Locked", lastLogin: "3d ago" },
  { id: "u_5", name: "Ishaan Reddy", email: "ishaan@polaris.in", role: "BranchManager", status: "Active", lastLogin: "1h ago" },
  { id: "u_6", name: "Diya Nair", email: "diya@meridian.edu", role: "Teacher", status: "Inactive", lastLogin: "2w ago" },
];

export const tickets: Ticket[] = [
  { id: "TKT-1042", subject: "QR scanner not detecting member badge", status: "Open", priority: "High", updated: "12m ago", category: "Hardware" },
  { id: "TKT-1041", subject: "Bulk member upload validation error", status: "Pending", priority: "Medium", updated: "1h ago", category: "Data" },
  { id: "TKT-1040", subject: "Invoice template branding request", status: "Resolved", priority: "Low", updated: "Yesterday", category: "Billing" },
  { id: "TKT-1039", subject: "Add WhatsApp notifications", status: "Open", priority: "Medium", updated: "2d ago", category: "Feature" },
];

// Time series
export function revenueTrend(days = 30) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const base = 12000 + Math.sin(i / 4) * 3500 + i * 320;
    const noise = (Math.cos(i * 1.7) + 1) * 1800;
    return {
      date: d.toISOString().slice(5, 10),
      revenue: Math.round(base + noise),
      renewals: Math.round((base + noise) * 0.62),
    };
  });
}

export function attendanceTrend(days = 14) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const present = 220 + Math.round(Math.sin(i / 2) * 35 + Math.random() * 25);
    const late = Math.round(present * (0.06 + Math.random() * 0.05));
    return {
      date: d.toISOString().slice(5, 10),
      present, late, absent: 280 - present + late,
    };
  });
}

export function occupancyHeatmap() {
  // 7 days x 12 hours
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const hours = Array.from({ length: 12 }, (_, i) => 8 + i);
  const data: { day: string; hour: number; value: number }[] = [];
  days.forEach((day, di) => {
    hours.forEach((hour, hi) => {
      const peak = 1 - Math.abs(hi - 6) / 8;
      const weekend = di >= 5 ? 0.6 : 1;
      const v = Math.max(0, Math.round(peak * weekend * 100 - Math.random() * 18));
      data.push({ day, hour, value: v });
    });
  });
  return { days, hours, data };
}

export function attendanceCalendar(year: number, month: number) {
  // month is 0-indexed
  const first = new Date(year, month, 1);
  const daysIn = new Date(year, month + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7; // Mon=0
  const cells: { date: Date | null; value: number }[] = [];
  for (let i = 0; i < startDow; i++) cells.push({ date: null, value: 0 });
  for (let d = 1; d <= daysIn; d++) {
    const date = new Date(year, month, d);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const v = Math.max(0, Math.round((weekend ? 35 : 85) + Math.sin(d / 3) * 15 - Math.random() * 20));
    cells.push({ date, value: v });
  }
  return cells;
}

export const recentActivity = [
  { id: "a1", actor: "Saanvi Iyer", action: "checked in", target: "Seat A-14", time: "just now" },
  { id: "a2", actor: "System", action: "renewed subscription for", target: "Kabir Khan", time: "2m ago" },
  { id: "a3", actor: "Riya Patel", action: "added member", target: "Vihaan Joshi", time: "8m ago" },
  { id: "a4", actor: "Ishaan Reddy", action: "moved", target: "Seat B-22 → C-04", time: "14m ago" },
  { id: "a5", actor: "System", action: "flagged late arrival on", target: "morning shift", time: "32m ago" },
  { id: "a6", actor: "Aarav Sharma", action: "exported", target: "Monthly revenue report", time: "1h ago" },
  { id: "a7", actor: "System", action: "marked seat", target: "D-09 under maintenance", time: "2h ago" },
];
