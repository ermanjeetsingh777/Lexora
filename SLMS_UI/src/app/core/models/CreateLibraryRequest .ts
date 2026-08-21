import { InstitutionStatus } from "@core/enums/OnbardingSteps";

export interface CreateLibraryRequest {
  name: string;
  description: string;
  address: string;
  email?: string;
  phone?: string;
  floor: number;
  capacity: number;
  isActive: boolean;
  isPrimary: boolean;
  isOnboarding: boolean;
  status: InstitutionStatus
}