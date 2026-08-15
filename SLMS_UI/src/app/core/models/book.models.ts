export enum BookStockStatus {
  Available = 1,
  LowStock = 2,
  OutOfStock = 3,
}

export enum BookLoanStatus {
  Active = 1,
  Returned = 2,
  Overdue = 3,
}

export interface LibraryScope {
  institutionId: string;
  branchId: string;
  libraryId: string;
}

export interface BookListItem {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  totalCopies: number;
  availableCopies: number;
  status: BookStockStatus;
  onLoanCount: number;
  overdueCount: number;
  hasPdf: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
}

export interface BookActivity {
  id: string;
  bookId: string;
  memberId: string;
  memberName: string;
  type: 'borrow' | 'return' | 'overdue';
  occurredAtUtc: string;
  dueAtUtc?: string | null;
  loanDays?: number | null;
  isOverdue?: boolean;
  daysOverdue?: number;
  estimatedFine?: number;
}

export interface BookAuditEntry {
  id: string;
  type: number;
  delta?: number | null;
  note?: string | null;
  actorName: string;
  occurredAtUtc: string;
}

export interface BookDetail extends BookListItem {
  institutionId: string;
  branchId: string;
  libraryId: string;
  notes?: string | null;
  pdfFileName?: string | null;
  activities: BookActivity[];
  auditEntries: BookAuditEntry[];
}

export interface BookStats {
  titleCount: number;
  totalCopies: number;
  availableCopies: number;
  onLoanCount: number;
  overdueCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  categories: { category: string; copies: number }[];
}

export interface CreateBookPayload {
  title: string;
  author: string;
  category: string;
  isbn: string;
  totalCopies: number;
  availableCopies: number;
  notes?: string;
}

export interface MemberBookLoan {
  id: string;
  bookId: string;
  title: string;
  author: string;
  category: string;
  borrowedAtUtc: string;
  dueAtUtc: string;
  returnedAtUtc?: string | null;
  status: BookLoanStatus;
  loanDays: number;
  daysOverdue: number;
  fineAmount: number;
}

export interface BookReturnResult {
  book: BookDetail;
  fineAmount?: number | null;
  overdueDays?: number | null;
}

export interface BookReminderResult {
  loanId: string;
  memberId: string;
  memberName: string;
  memberPhone?: string | null;
  bookTitle: string;
  dueAtUtc: string;
  daysOverdue: number;
  estimatedFine: number;
  message: string;
}

export const BOOK_STATUS_LABELS: Record<BookStockStatus, string> = {
  [BookStockStatus.Available]: 'Available',
  [BookStockStatus.LowStock]: 'Low stock',
  [BookStockStatus.OutOfStock]: 'Out of stock',
};

export const LOAN_STATUS_LABELS: Record<BookLoanStatus, string> = {
  [BookLoanStatus.Active]: 'Active',
  [BookLoanStatus.Returned]: 'Returned',
  [BookLoanStatus.Overdue]: 'Overdue',
};
