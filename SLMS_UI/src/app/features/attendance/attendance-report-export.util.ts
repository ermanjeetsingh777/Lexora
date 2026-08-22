import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AttendanceRecordListItem, AttendanceResponse, AttendanceSource, AttendanceStatus } from '@core/models/attendanceModels';
import { formatAttendanceDisplayTime } from './attendance-format.util';

export interface AttendanceExportRow {
  date: string;
  memberName: string;
  membershipNo: string;
  libraryName: string;
  branchName: string;
  shift: string;
  checkIn: string;
  checkOut: string;
  duration: string;
  seatNo: string;
  status: string;
  source: string;
}

export interface AttendanceExportMeta {
  title: string;
  subtitle: string;
  filenameBase: string;
}

function statusLabel(status: AttendanceStatus): string {
  return AttendanceStatus[status] ?? String(status);
}

function sourceLabel(source: AttendanceSource | undefined): string {
  if (source == null) return '—';
  return AttendanceSource[source] ?? String(source);
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} min`;
  return `${hours}h ${mins}m`;
}

function normalizeDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

function formatDisplayDate(value: string): string {
  const parsed = new Date(`${normalizeDate(value)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function mapModuleRecordToExportRow(record: AttendanceRecordListItem): AttendanceExportRow {
  return {
    date: formatDisplayDate(record.attendanceDate),
    memberName: record.memberName,
    membershipNo: record.membershipNo,
    libraryName: record.libraryName,
    branchName: record.branchName,
    shift: record.shift ?? '—',
    checkIn: formatAttendanceDisplayTime(record.checkInAtUtc, record.checkInTime),
    checkOut: formatAttendanceDisplayTime(record.checkOutAtUtc, record.checkOutTime),
    duration: formatDuration(record.durationMinutes),
    seatNo: record.seatNo ?? '—',
    status: statusLabel(record.status),
    source: sourceLabel(record.source),
  };
}

export function mapMemberRecordToExportRow(
  record: AttendanceResponse,
  memberName: string,
  membershipNo: string,
  libraryName: string,
  branchName: string,
  shift: string,
): AttendanceExportRow {
  return {
    date: formatDisplayDate(record.attendanceDate),
    memberName,
    membershipNo,
    libraryName,
    branchName,
    shift: shift || '—',
    checkIn: formatAttendanceDisplayTime(record.checkInAtUtc, record.checkInTime),
    checkOut: formatAttendanceDisplayTime(record.checkOutAtUtc, record.checkOutTime),
    duration: formatDuration(record.durationMinutes),
    seatNo: record.seatNo ?? '—',
    status: statusLabel(record.status),
    source: sourceLabel(record.source),
  };
}

const MODULE_COLUMNS: { key: keyof AttendanceExportRow; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'memberName', label: 'Member' },
  { key: 'membershipNo', label: 'Membership No' },
  { key: 'libraryName', label: 'Library' },
  { key: 'branchName', label: 'Branch' },
  { key: 'shift', label: 'Shift' },
  { key: 'checkIn', label: 'Check-in' },
  { key: 'checkOut', label: 'Check-out' },
  { key: 'duration', label: 'Duration' },
  { key: 'seatNo', label: 'Seat' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
];

const MEMBER_COLUMNS: { key: keyof AttendanceExportRow; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'checkIn', label: 'Check-in' },
  { key: 'checkOut', label: 'Check-out' },
  { key: 'duration', label: 'Duration' },
  { key: 'seatNo', label: 'Seat' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
];

function rowsToSheet(rows: AttendanceExportRow[], columns: { key: keyof AttendanceExportRow; label: string }[]) {
  return rows.map((row) => {
    const entry: Record<string, string> = {};
    for (const column of columns) {
      entry[column.label] = row[column.key];
    }
    return entry;
  });
}

export function downloadAttendanceExcel(
  rows: AttendanceExportRow[],
  meta: AttendanceExportMeta,
  mode: 'module' | 'member',
): void {
  const columns = mode === 'member' ? MEMBER_COLUMNS : MODULE_COLUMNS;
  const sheet = XLSX.utils.json_to_sheet(rowsToSheet(rows, columns));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Attendance');
  XLSX.writeFile(workbook, `${meta.filenameBase}.xlsx`);
}

export function downloadAttendancePdf(
  rows: AttendanceExportRow[],
  meta: AttendanceExportMeta,
  mode: 'module' | 'member',
): void {
  const columns = mode === 'member' ? MEMBER_COLUMNS : MODULE_COLUMNS;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(14);
  doc.text(meta.title, 40, 36);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(meta.subtitle, 40, 54);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 68,
    head: [columns.map((column) => column.label)],
    body: rows.map((row) => columns.map((column) => row[column.key])),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`${meta.filenameBase}.pdf`);
}

export function buildExportFilename(base: string, dateFrom: string, dateTo: string): string {
  return `${base}-${dateFrom}-to-${dateTo}`.replace(/[^\w.-]+/g, '-');
}
