export interface CheckInRequest {
    memberId: string;
    seatNumber?: string;
    deviceId?: string;
    remarks?: string;
}

export interface CheckOutRequest {
    memberId: string;
    seatNumber?: string;
    deviceId?: string;
    remarks?: string;
}

export interface CreateAttendanceRequest {
    memberId: string;
    attendanceDate: string;       // yyyy-MM-dd
    checkInTime?: string | null;  // HH:mm:ss
    checkOutTime?: string | null; // HH:mm:ss
    status: AttendanceStatus;
    source: AttendanceSource;
    seatNumber?: string;
    deviceId?: string;
    remarks?: string;
}

export interface UpdateAttendanceRequest {
    checkInTime?: string | null;
    checkOutTime?: string | null;
    status: AttendanceStatus;
    seatNumber?: string;
    deviceId?: string;
    remarks?: string;
    isActive: boolean;
}

export interface AttendanceResponse {
    id: string;
    memberId: string;
    attendanceDate: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    checkInAtUtc?: Date | null;
    checkOutAtUtc?: Date | null;
    durationMinutes: number;
    status: AttendanceStatus;
    source: AttendanceSource;
    seatNo?: string;
    remarks?: string;
    isActive: boolean;
}

export interface AttendanceHistoryResponse {
    id: string;
    memberId: string;
    attendanceDate: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    durationMinutes: number;
    status: AttendanceStatus;
}

export interface AttendanceStatisticsResponse {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    lateDays: number;
    attendancePercentage: number;
    totalStudyMinutes: number;
    currentStreak: number;
    longestStreak: number;
}

export interface AttendanceCalendarResponse {
    date: string;
    status: AttendanceStatus;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    durationMinutes: number;
    isWeekend: boolean;
    isHoliday: boolean;
    holidayName?: string;
    remarks?: string;
}

export enum AttendanceStatus {
    CheckedIn = 1,
    CheckedOut = 2,
    AutoCheckedOut = 3,
    MissedCheckout = 4,
    Late = 5,
    Absent = 6,
    Leave = 7,
    Holiday = 8,
    Present = 9,
    HalfDay = 10
}

export enum AttendanceSource {
    Manual = 1,
    QRCode = 2,
    RFID = 3,
    Biometric = 4,
    MobileApp = 5,
    Admin = 6
}

export interface ScannerContext {
    libraryId: string;
    libraryName: string;
    branchId: string;
    branchName: string;
    institutionId: string;
    institutionName: string;
    token: string;
    scanUrl: string;
}

export interface ScannerMemberOption {
    id: string;
    membershipNo: string;
    fullName: string;
    seatNumber?: string | null;
    shift?: string | null;
}

export interface ScannerMemberStatus {
    memberId: string;
    membershipNo: string;
    fullName: string;
    isCheckedInToday: boolean;
    isCheckedOutToday: boolean;
    status?: AttendanceStatus | null;
    suggestedAction: 'check-in' | 'check-out' | 'done';
    checkInTime?: string | null;
    checkOutTime?: string | null;
    checkInAtUtc?: string | Date | null;
    checkOutAtUtc?: string | Date | null;
    seatNumber?: string | null;
}

export interface AttendanceSeatOption {
    seatId?: string | null;
    seatNumber: string;
    isActive: boolean;
    isOccupied: boolean;
    occupiedBy?: string | null;
}

export interface ScannerAttendanceRequest {
    libraryToken: string;
    memberId: string;
    action: 'check-in' | 'check-out' | 'auto';
    seatNumber?: string;
    deviceId?: string;
    remarks?: string;
}

export interface ScannerAttendanceResult {
    action: string;
    message: string;
    member: ScannerMemberOption;
    attendance: AttendanceResponse;
}

export interface ScannerQrCode {
    libraryId: string;
    libraryName: string;
    token: string;
    scanUrl: string;
    qrCodeBase64: string;
}

export interface MemberScannerContext {
    memberId: string;
    membershipNo: string;
    fullName: string;
    token: string;
    scanUrl: string;
    libraryId: string;
    libraryName: string;
    branchName: string;
    institutionName: string;
}

export interface MemberScannerRecordRequest {
    memberToken: string;
    action: 'check-in' | 'check-out' | 'auto';
    seatNumber?: string;
    deviceId?: string;
    remarks?: string;
}

export interface MemberQrCode {
    memberId: string;
    membershipNo: string;
    fullName: string;
    token: string;
    scanUrl: string;
    qrCodeBase64: string;
}

export interface AttendanceModuleQuery {
    libraryId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    status?: AttendanceStatus;
    page?: number;
    pageSize?: number;
}

export interface AttendanceModuleSummary {
    totalRecords: number;
    uniqueMembers: number;
    currentlyCheckedIn: number;
    checkedOut: number;
    accessibleLibraries: number;
    dateFrom: string;
    dateTo: string;
}

export interface AttendanceRecordListItem {
    id: string;
    memberId: string;
    memberName: string;
    membershipNo: string;
    shift?: string | null;
    libraryId: string;
    libraryName: string;
    branchName: string;
    institutionName: string;
    attendanceDate: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    checkInAtUtc?: string | Date | null;
    checkOutAtUtc?: string | Date | null;
    durationMinutes: number;
    status: AttendanceStatus;
    source: AttendanceSource;
    seatNo?: string | null;
}

export interface PagedAttendanceRecords {
    items: AttendanceRecordListItem[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}