export interface CreateCustomerReviewRequest {
  fullName: string;
  email: string;
  organizationName?: string;
  role?: string;
  rating: number;
  title?: string;
  comment: string;
  suggestion?: string;
}

export interface CustomerReviewItem {
  id: string;
  fullName: string;
  email: string;
  organizationName?: string;
  role?: string;
  rating: number;
  title?: string;
  comment: string;
  suggestion?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  isApproved: boolean;
  adminRemarks?: string;
  approvedAtUtc?: string;
  createdAtUtc: string;
}

export interface PublicCustomerReviewItem {
  id: string;
  fullName: string;
  email: string;
  organizationName?: string;
  role?: string;
  rating: number;
  title?: string;
  comment: string;
  suggestion?: string;
  createdAtUtc: string;
}

export interface ApproveCustomerReviewRequest {
  adminRemarks?: string;
}

export interface RejectCustomerReviewRequest {
  adminRemarks?: string;
}
