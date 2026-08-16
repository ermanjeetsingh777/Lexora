import { MemberPlanType, Shift } from "@core/constType";
import { ContactRelation, PlanStatus } from "@core/enums/OnbardingSteps";
import { AttendanceResponse } from "./attendanceModels";

export interface CreateMemberRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: Date | null;
  gender?: string;
  planId: string;
  shift: Shift | null
}
export interface CreateMemberResponse {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  membershipNo: string;
}

export interface MemberListResponse {
  id: string;
  name: string;
  userName: string;
  email: string;
  phone: string;
  avatar: string;
  avatarHue: number;
  hasPhoto?: boolean;
  hasAadhaar?: boolean;

  institution: string;
  branch: string;
  library: string;

  membership: string;
  plan: MemberPlanType;
  planId : string;
  shift: string;

  seat: string;
  seatNumber: string;

  status: string;
  planStatus: PlanStatus;

  joinDate: string;
  lastVisit: string;

  visits30d: number;
  attendanceRate: number;
  feesOwed: number;
  planStartDate: Date,
  planEndDate: Date,
  planDurationInDays: number;
  daysRemaining: number
}

export interface MemberDetailResponse {
  id: string;

  name: string;
  email: string | null;
  phone: string | null;

  dateOfBirth: string | null;
  gender: string | null;

  membershipNo: string | null;

  isActive: boolean;
  status: string;
  planStatus: PlanStatus;

  institutionId: string;
  institution: string;

  branchId: string;
  branch: string;

  libraryId: string;
  library: string;

  planId: string | null;
  plan: MemberPlanType;
  planPrice: number | null;

  planStartDate: string | null;
  planEndDate: string | null;
  planDurationInDays: number;

  shift: string | null;

  seatId: string | null;
  seatNumber: string | null;
  joinedOn: string | null;
  lastVisit: string | null;
  visits30d: number;
  presentDays: number;
  totalSessions: number;
  attendanceSummary: string;
  attendanceRate: number;
  feesOwed: number;
  dueDate: Date | null;
  lastPaymentDate: Date | null;
  invoiceCount: number;

  createdAtUtc: string;
  hasPhoto?: boolean;
  hasAadhaar?: boolean;
  // Guardian / Emergency Contacts
  contacts: MemberContactResponse[];
  plans: MemberPlanResponse[];
  attendance: AttendanceResponse[],
  todayAttendance: AttendanceResponse
}

export interface MemberContactResponse extends CreateMemberContactRequest {
  id?: string;
}

export interface CreateMemberContactRequest {
  fullName: string;
  phoneNumber: string;
  email: string | null;
  relation: ContactRelation | null;
  isGuardian: boolean;
  isEmergencyContact: boolean;
  isPrimary: boolean;
  isActive: boolean;
}

export interface MemberPlanResponse {
  id: string;
  planId: string;
  planName: MemberPlanType;
  price: number;
  durationInDays: number;
  startDate: string;
  endDate: string;
  paidAmount: number;
  adjustmentAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  isCurrent: boolean;
  isActive: boolean;
  status: string,
  createdAtUtc: string;
}

export interface ChangeMemberPlanShiftRequest {
  planId?: string | null;
  shift?: string | null;
}

export interface MemberInsightCard {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  iconColor: string;
}