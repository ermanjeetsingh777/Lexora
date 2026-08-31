import { Shift } from '@core/constType';
import { PlanResponse } from '@core/models/institution-dropdown.model';
import * as XLSX from 'xlsx';

export interface ParsedBulkMemberRow {
  rowNumber: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date | null;
  gender: string;
  shift: string;
  planName: string;
}

const PHONE_REGEX = /^[6-9]\d{9}$/;
const VALID_GENDERS = new Set(['male', 'female', 'other']);
const VALID_SHIFTS = new Set(['morning', 'afternoon', 'evening', 'night', 'full', 'general']);
const HEADER_ALIASES: Record<string, keyof Omit<ParsedBulkMemberRow, 'rowNumber'>> = {
  fullname: 'fullName',
  email: 'email',
  phonenumber: 'phoneNumber',
  dateofbirth: 'dateOfBirth',
  gender: 'gender',
  shift: 'shift',
  planname: 'planName',
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

function cellToString(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function parseDateOfBirth(value: unknown): Date | null {
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

function isEmptyRow(values: string[]): boolean {
  return values.every((value) => !value.trim());
}

export async function parseMemberBulkExcel(file: File): Promise<ParsedBulkMemberRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames.find((name) => name.toLowerCase() === 'members') ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][];

  if (matrix.length < 2) {
    return [];
  }

  const headerRow = matrix[0] ?? [];
  const columnMap = new Map<number, keyof Omit<ParsedBulkMemberRow, 'rowNumber'>>();

  headerRow.forEach((header, index) => {
    const mapped = HEADER_ALIASES[normalizeHeader(header)];
    if (mapped) {
      columnMap.set(index, mapped);
    }
  });

  const requiredColumns = Object.values(HEADER_ALIASES);
  const mappedColumns = new Set(columnMap.values());
  if (!requiredColumns.every((column) => mappedColumns.has(column))) {
    throw new Error('Invalid template. Required columns: FullName, Email, PhoneNumber, DateOfBirth, Gender, Shift, PlanName.');
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
    };

    columnMap.forEach((field, columnIndex) => {
      const rawValue = rawRow[columnIndex];
      if (field === 'dateOfBirth') {
        parsed.dateOfBirth = parseDateOfBirth(rawValue);
        return;
      }
      parsed[field] = cellToString(rawValue);
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

  if (!row.dateOfBirth) return 'DateOfBirth is required and must be in yyyy-MM-dd format.';
  if (!row.gender.trim()) return 'Gender is required.';
  if (!VALID_GENDERS.has(row.gender.trim().toLowerCase())) {
    return 'Gender must be Male, Female, or Other.';
  }

  if (!row.shift.trim()) return 'Shift is required.';
  if (!VALID_SHIFTS.has(row.shift.trim().toLowerCase())) {
    return 'Shift must be Morning, Afternoon, Evening, Night, Full, or General.';
  }

  if (!row.planName.trim()) return 'PlanName is required.';
  if (!planByName.has(row.planName.trim().toLowerCase())) {
    return `Plan '${row.planName}' was not found for this library.`;
  }

  return null;
}

export function toCreateMemberShift(shift: string): Shift {
  const normalized = shift.trim();
  const options: Shift[] = ['Morning', 'Afternoon', 'Evening', 'Night', 'Full', 'General'];
  return options.find((option) => option.toLowerCase() === normalized.toLowerCase()) ?? 'General';
}
