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