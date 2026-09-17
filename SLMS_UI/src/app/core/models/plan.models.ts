export interface CreatePlanRequest {
  name: string;
  description?: string | null;
  price: number;
  durationInDays: number;
  maxSeats?: number | null;
  /** HH:mm — defaults to library hours when omitted on create */
  startTime?: string | null;
  endTime?: string | null;
  isActive: boolean;
}

export interface UpdatePlanRequest {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  durationInDays: number;
  maxSeats?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  isActive: boolean;
}
