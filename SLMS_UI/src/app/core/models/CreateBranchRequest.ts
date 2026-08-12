import { InstitutionStatus } from "@core/enums/OnbardingSteps";

export interface CreateBranchRequest {
  name: string;
  institutionId: string; // Guid
  email?: string;
  phone?: string;
  description?: string;
  address?: string;
  city?: string;
  closesAt?: string; // TimeOnly (e.g., "18:00")
  openAt?: string;   // TimeOnly (e.g., "09:00")
  capacity?: number;
  isActive: boolean;
  isPrimary: boolean;
  isOnboarding: boolean;
  status : InstitutionStatus
}