export interface UpdateBranchRequest {
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  operatingHoursStart?: string;
  operatingHoursEnd?: string;
  capacity?: number;
  isActive?: boolean;
}
