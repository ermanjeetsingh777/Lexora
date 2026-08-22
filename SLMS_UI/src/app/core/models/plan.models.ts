export interface CreatePlanRequest {
  name: string;
  description?: string | null;
  price: number;
  durationInDays: number;
  maxSeats?: number | null;
  isActive: boolean;
}

export interface UpdatePlanRequest {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  durationInDays: number;
  maxSeats?: number | null;
  isActive: boolean;
}
