namespace SLMS_API.Common.Enums
{
    public enum AttendanceStatus
    {
        CheckedIn = 1,
        CheckedOut = 2,
        AutoCheckedOut = 3,
        MissedCheckout = 4,
        Late = 5,
        Absent = 6,
        Leave = 7,
        Holiday = 8,
        Present = 9,
        HalfDay = 10,
    }

    public enum AttendanceSource
    {
        Manual = 1,
        QRCode = 2,
        RFID = 3,
        Biometric = 4,
        MobileApp = 5,
        Admin = 6
    }
}
