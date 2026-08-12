// Demo dataset for the /students module. Used as a fallback whenever the
// backend returns no rows so the list & detail pages stay interactive.

export type DemoStudent = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive" | "Suspended";
  shift: "Morning" | "Afternoon" | "Evening" | "Night";
  roll_no: string;
  class_grade: string;
  guardian_name: string;
  guardian_phone: string;
  seat: string;
  branch: string;
  library: string;
  plan: string;
  fees_owed: number;
  attendance_rate: number; // %
  join_date: string;
  avatar_hue: number;
};

const FIRST = ["Aarav", "Saanvi", "Kabir", "Ishaan", "Meera", "Vihaan", "Anaya", "Rohan", "Aditi", "Arjun", "Riya", "Neha", "Dev", "Zara", "Kiaan", "Priya", "Yash", "Tanvi", "Aryan", "Nitya", "Rehan", "Isha", "Vivaan", "Diya"];
const LAST = ["Sharma", "Iyer", "Rao", "Reddy", "Patel", "Das", "Singh", "Menon", "Nair", "Verma", "Kapoor", "Bose", "Malhotra", "Ahmed", "Bhat", "Joshi", "Gupta", "Shah", "Khanna", "Pillai", "Qureshi", "Chawla", "Sethi", "Roy"];
const GRADES = ["8-A", "8-B", "9-A", "9-B", "10-A", "10-B", "11-Sci", "11-Com", "12-Sci", "12-Com"];
const SHIFTS = ["Morning", "Afternoon", "Evening", "Night"] as const;
const STATUSES = ["Active", "Active", "Active", "Active", "Inactive", "Suspended"] as const;
const BRANCHES = ["Downtown", "Riverside", "North Park", "East Campus"];
const LIBS = ["Central Reading Hall", "West Wing Study", "Silent Zone", "Quiet Loft"];
const PLANS = ["Student Basic", "Student Plus", "Scholar Pro", "Annual Scholar"];

export const DEMO_STUDENTS: DemoStudent[] = Array.from({ length: 32 }, (_, i) => {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 3) % LAST.length];
  const name = `${first} ${last}`;
  const grade = GRADES[i % GRADES.length];
  const shift = SHIFTS[i % 4];
  const status = STATUSES[i % STATUSES.length];
  const joinYear = 2023 + (i % 3);
  const joinMonth = ((i * 5) % 12) + 1;
  const joinDay = ((i * 7) % 27) + 1;
  return {
    id: `demo_stu_${i + 1}`,
    name,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@school.edu`,
    phone: `+91 9${(1000000000 + i * 12345).toString().slice(0, 9)}`,
    status,
    shift,
    roll_no: `${grade}-${(i + 1).toString().padStart(2, "0")}`,
    class_grade: grade,
    guardian_name: `${LAST[(i * 7) % LAST.length]} (parent)`,
    guardian_phone: `+91 9${(2000000000 + i * 54321).toString().slice(0, 9)}`,
    seat: `${String.fromCharCode(65 + (i % 4))}-${(i % 20) + 1}`,
    branch: BRANCHES[i % BRANCHES.length],
    library: LIBS[i % LIBS.length],
    plan: PLANS[i % PLANS.length],
    fees_owed: (i % 5 === 0 ? 0 : (i * 137) % 4200),
    attendance_rate: 60 + ((i * 13) % 38),
    join_date: `${joinYear}-${joinMonth.toString().padStart(2, "0")}-${joinDay.toString().padStart(2, "0")}`,
    avatar_hue: (i * 37) % 360,
  };
});

export function getDemoStudent(id: string) {
  return DEMO_STUDENTS.find(s => s.id === id) ?? DEMO_STUDENTS[0];
}

// 14-day attendance sparkline per student (deterministic from id length)
export function studentAttendance14d(seed: number) {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const base = weekend ? 0 : 1;
    const v = base * (60 + ((seed + i * 17) % 40));
    return { date: d.toISOString().slice(5, 10), hours: Math.round(v) / 10 };
  });
}

export function studentPayments(seed: number) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return months.map((m, i) => ({
    id: `pay_${seed}_${i}`,
    month: m,
    amount: 1200 + ((seed + i * 23) % 800),
    status: i === months.length - 1 && seed % 5 === 0 ? "Due" : "Paid",
    date: `2026-${(i + 1).toString().padStart(2, "0")}-05`,
  }));
}

export function studentActivity(seed: number) {
  const events = [
    { kind: "checkin", text: "Checked in at Central Reading Hall" },
    { kind: "payment", text: "Paid monthly fee (₹1,500)" },
    { kind: "seat", text: "Moved to seat B-12" },
    { kind: "attendance", text: "Marked late for Morning shift" },
    { kind: "plan", text: "Upgraded to Scholar Pro" },
    { kind: "checkout", text: "Checked out after 4h 20m" },
  ];
  return events.map((e, i) => ({
    id: `act_${seed}_${i}`,
    ...e,
    minutesAgo: (i * 47 + seed) % 720,
  }));
}
