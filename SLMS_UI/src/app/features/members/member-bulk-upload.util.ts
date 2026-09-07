import { Shift } from '@core/constType';
import { PlanResponse } from '@core/models/institution-dropdown.model';
import * as XLSX from 'xlsx';

export interface ParsedBulkMemberRow {
  rowNumber: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date | null;
  rawDateOfBirth?: string;
  gender: string;
  shift: string;
  planName: string;
  membershipNo: string;
  planStartDate: Date | null;
  rawPlanStartDate?: string;
  planEndDate: Date | null;
  rawPlanEndDate?: string;
  /** Null = use full plan price. */
  paidAmount: number | null;
  rawPaidAmount?: string;
  /** Null/blank = 0. */
  dueAmount: number | null;
  rawDueAmount?: string;
}

const PHONE_REGEX = /^[6-9]\d{9}$/;
const MEMBERSHIP_NO_REGEX = /^[A-Za-z0-9][A-Za-z0-9._\-]*$/;
const VALID_GENDERS = new Set(['male', 'female', 'other']);
const VALID_SHIFTS = new Set(['morning', 'afternoon', 'evening', 'night', 'full', 'general']);

type BulkField =
  | 'fullName'
  | 'email'
  | 'phoneNumber'
  | 'dateOfBirth'
  | 'gender'
  | 'shift'
  | 'planName'
  | 'membershipNo'
  | 'planStartDate'
  | 'planEndDate'
  | 'paidAmount'
  | 'dueAmount'
  | 'planAmount'
  | 'adjustmentAmount';

const HEADER_ALIASES: Record<string, BulkField> = {
  fullname: 'fullName',
  email: 'email',
  phonenumber: 'phoneNumber',
  dateofbirth: 'dateOfBirth',
  gender: 'gender',
  shift: 'shift',
  planname: 'planName',
  membershipno: 'membershipNo',
  memberid: 'membershipNo',
  planstartdate: 'planStartDate',
  planenddate: 'planEndDate',
  paidamount: 'paidAmount',
  dueamount: 'dueAmount',
  planamount: 'planAmount',
  adjustmentamount: 'adjustmentAmount',
  adjustment: 'adjustmentAmount',
};

const REQUIRED_COLUMNS: BulkField[] = ['fullName', 'phoneNumber', 'gender', 'shift', 'planName'];

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

function cellToString(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

function parseExcelDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const text = cellToString(value);
  if (!text) return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (isoMatch) {
    const parsed = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseExcelNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = cellToString(value);
  if (!text) return null;
  const n = Number(text.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function toIsoDate(value: Date | null): string | undefined {
  if (!value) return undefined;
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isEmptyRow(values: string[]): boolean {
  return values.every((value) => !value.trim());
}

export async function parseMemberBulkExcel(file: File): Promise<ParsedBulkMemberRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames.find((name) => name.toLowerCase() === 'members') ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true }) as unknown[][];

  if (matrix.length < 2) {
    return [];
  }

  const headerRow = matrix[0] ?? [];
  const columnMap = new Map<number, BulkField>();

  headerRow.forEach((header, index) => {
    const mapped = HEADER_ALIASES[normalizeHeader(header)];
    if (mapped) {
      columnMap.set(index, mapped);
    }
  });

  const mappedColumns = new Set(columnMap.values());
  if (!REQUIRED_COLUMNS.every((column) => mappedColumns.has(column))) {
    throw new Error(
      'Invalid template. Required: FullName, PhoneNumber, Gender, Shift, PlanName. Optional: Email, DateOfBirth, MembershipNo, PlanStartDate, PlanEndDate, PaidAmount, DueAmount.',
    );
  }

  const rows: ParsedBulkMemberRow[] = [];

  for (let index = 1; index < matrix.length; index++) {
    const rawRow = matrix[index] ?? [];
    const values = rawRow.map(cellToString);
    if (isEmptyRow(values)) continue;

    const parsed: ParsedBulkMemberRow = {
      rowNumber: index + 1,
      fullName: '',
      email: '',
      phoneNumber: '',
      dateOfBirth: null,
      gender: '',
      shift: '',
      planName: '',
      membershipNo: '',
      planStartDate: null,
      planEndDate: null,
      paidAmount: null,
      dueAmount: null,
    };

    columnMap.forEach((field, columnIndex) => {
      const rawValue = rawRow[columnIndex];
      // Auto columns — ignore on import (server uses PlanName + Paid/Due)
      if (field === 'planAmount' || field === 'adjustmentAmount') return;

      if (field === 'dateOfBirth') {
        parsed.rawDateOfBirth = cellToString(rawValue);
        parsed.dateOfBirth = parseExcelDate(rawValue);
        return;
      }
      if (field === 'planStartDate') {
        parsed.rawPlanStartDate = cellToString(rawValue);
        parsed.planStartDate = parseExcelDate(rawValue);
        return;
      }
      if (field === 'planEndDate') {
        parsed.rawPlanEndDate = cellToString(rawValue);
        parsed.planEndDate = parseExcelDate(rawValue);
        return;
      }
      if (field === 'paidAmount') {
        parsed.rawPaidAmount = cellToString(rawValue);
        parsed.paidAmount = parseExcelNumber(rawValue);
        return;
      }
      if (field === 'dueAmount') {
        parsed.rawDueAmount = cellToString(rawValue);
        parsed.dueAmount = parseExcelNumber(rawValue);
        return;
      }
      parsed[field] = cellToString(rawValue) as never;
    });

    rows.push(parsed);
  }

  return rows;
}

export function validateBulkMemberRow(
  row: ParsedBulkMemberRow,
  planByName: Map<string, PlanResponse>,
  seenEmails: Set<string>,
  seenPhones: Set<string>,
  seenMembershipNos: Set<string>,
): string | null {
  if (!row.fullName.trim()) return 'FullName is required.';
  if (row.fullName.trim().length < 2 || row.fullName.trim().length > 100) {
    return 'FullName must be between 2 and 100 characters.';
  }

  if (row.email && row.email.trim()) {
    if (!row.email.includes('@') || row.email.length > 150) return 'Email is invalid.';

    const normalizedEmail = row.email.trim().toLowerCase();
    if (seenEmails.has(normalizedEmail)) {
      return `Duplicate email '${row.email.trim()}' found in the uploaded file.`;
    }
  }

  if (!row.phoneNumber.trim()) return 'PhoneNumber is required.';
  if (!PHONE_REGEX.test(row.phoneNumber.trim())) {
    return 'PhoneNumber must be a valid 10-digit mobile number starting with 6–9.';
  }

  const normalizedPhone = row.phoneNumber.trim();
  if (seenPhones.has(normalizedPhone)) {
    return `Duplicate phone number '${normalizedPhone}' found in the uploaded file.`;
  }

  if (row.rawDateOfBirth && row.rawDateOfBirth.trim() && !row.dateOfBirth) {
    return 'DateOfBirth must be in yyyy-MM-dd format.';
  }

  if (!row.gender.trim()) return 'Gender is required.';
  if (!VALID_GENDERS.has(row.gender.trim().toLowerCase())) {
    return 'Gender must be Male, Female, or Other.';
  }

  if (!row.shift.trim()) return 'Shift is required.';
  if (!VALID_SHIFTS.has(row.shift.trim().toLowerCase())) {
    return 'Shift must be Morning, Afternoon, Evening, Night, Full, or General.';
  }

  if (!row.planName.trim()) return 'PlanName is required.';
  const plan = planByName.get(row.planName.trim().toLowerCase());
  if (!plan) {
    return `Plan '${row.planName}' was not found for this library.`;
  }

  const membershipNo = row.membershipNo.trim();
  if (membershipNo) {
    if (membershipNo.length > 40) return 'MembershipNo must be 40 characters or fewer.';
    if (!MEMBERSHIP_NO_REGEX.test(membershipNo)) {
      return "MembershipNo must start with a letter or digit and may contain letters, digits, '.', '_' or '-'.";
    }
    if (seenMembershipNos.has(membershipNo.toLowerCase())) {
      return `Duplicate MembershipNo '${membershipNo}' found in the uploaded file.`;
    }
  }

  if (row.rawPlanStartDate && row.rawPlanStartDate.trim() && !row.planStartDate) {
    return 'PlanStartDate must be in yyyy-MM-dd format.';
  }

  if (row.rawPlanEndDate && row.rawPlanEndDate.trim() && !row.planEndDate) {
    return 'PlanEndDate must be in yyyy-MM-dd format.';
  }

  if (row.planStartDate && row.planEndDate) {
    const start = toIsoDate(row.planStartDate)!;
    const end = toIsoDate(row.planEndDate)!;
    if (end <= start) return 'PlanEndDate must be after PlanStartDate.';
  }

  if (row.rawPaidAmount && row.rawPaidAmount.trim() && row.paidAmount == null) {
    return 'PaidAmount must be a valid number.';
  }

  if (row.rawDueAmount && row.rawDueAmount.trim() && row.dueAmount == null) {
    return 'DueAmount must be a valid number.';
  }

  if (row.paidAmount != null && row.paidAmount < 0) return 'PaidAmount cannot be negative.';
  if (row.dueAmount != null && row.dueAmount < 0) return 'DueAmount cannot be negative.';

  const planPrice = plan.price ?? 0;
  const paid = row.paidAmount ?? planPrice;
  const due = row.dueAmount ?? 0;
  if (paid + due > planPrice + 0.001) {
    return `PaidAmount + DueAmount cannot exceed plan amount ₹${planPrice}.`;
  }

  return null;
}

export function toCreateMemberShift(shift: string): Shift {
  const normalized = shift.trim();
  const options: Shift[] = ['Morning', 'Afternoon', 'Evening', 'Night', 'Full', 'General'];
  return options.find((option) => option.toLowerCase() === normalized.toLowerCase()) ?? 'General';
}

export function toBulkPlanDateIso(value: Date | null): string | undefined {
  return toIsoDate(value);
}
