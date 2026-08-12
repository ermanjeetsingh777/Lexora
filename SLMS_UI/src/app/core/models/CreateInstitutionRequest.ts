import { InstitutionStatus } from "@core/enums/OnbardingSteps";

export interface CreateInstitutionRequest {
  name: string;
  description?: string;
  type?: 'Library' | 'College' | 'University' | 'School' | 'Coaching' | 'Other' | undefined;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timeZone?: string;
  isActive: boolean;
  isPrimary: boolean;
  isOnboarding: boolean;
  status: InstitutionStatus;
}

export interface InstitutionCardResponse {
  id: string;
  code: string;
  name: string;
  initials: string;
  type?: string;
  location?: string;
  updateCount: number;
  occupancyPercent: number;
  branchCount: number;
  memberCount: number;
  revenue: number;
  healthStatus: string;
  logoUrl?: string;
  isActive: boolean;
  status: InstitutionStatus;
}