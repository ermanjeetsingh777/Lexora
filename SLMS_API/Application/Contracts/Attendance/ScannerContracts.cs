using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Attendance;

public class ScannerContextResponse
{
    public Guid LibraryId { get; set; }
    public string LibraryName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public Guid InstitutionId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string ScanUrl { get; set; } = string.Empty;
}

public class ScannerMemberOption
{
    public Guid Id { get; set; }
    public string MembershipNo { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? SeatNumber { get; set; }
    public string? Shift { get; set; }
}

public class ScannerMemberStatusResponse
{
    public Guid MemberId { get; set; }
    public string MembershipNo { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public bool IsCheckedInToday { get; set; }
    public bool IsCheckedOutToday { get; set; }
    public AttendanceStatus? Status { get; set; }
    /// <summary>check-in | check-out | done</summary>
    public string SuggestedAction { get; set; } = "check-in";
    public TimeOnly? CheckInTime { get; set; }
    public TimeOnly? CheckOutTime { get; set; }
}

public class ScannerAttendanceRequest
{
    public string LibraryToken { get; set; } = string.Empty;
    public Guid MemberId { get; set; }
    /// <summary>check-in | check-out | auto</summary>
    public string Action { get; set; } = "auto";
    public string? SeatNumber { get; set; }
    public string? DeviceId { get; set; }
    public string? Remarks { get; set; }
}

public class ScannerAttendanceResultResponse
{
    public string Action { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public ScannerMemberOption Member { get; set; } = new();
    public Contracts.Organizations.Requests.AttendanceResponse Attendance { get; set; } = new();
}

public class ScannerQrCodeResponse
{
    public Guid LibraryId { get; set; }
    public string LibraryName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string ScanUrl { get; set; } = string.Empty;
    public string QrCodeBase64 { get; set; } = string.Empty;
}

public class MemberScannerContextResponse
{
    public Guid MemberId { get; set; }
    public string MembershipNo { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string ScanUrl { get; set; } = string.Empty;
    public Guid LibraryId { get; set; }
    public string LibraryName { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public string InstitutionName { get; set; } = string.Empty;
}

public class MemberScannerRecordRequest
{
    public string MemberToken { get; set; } = string.Empty;
    /// <summary>check-in | check-out | auto</summary>
    public string Action { get; set; } = "auto";
    public string? SeatNumber { get; set; }
    public string? DeviceId { get; set; }
    public string? Remarks { get; set; }
}

public class MemberQrCodeResponse
{
    public Guid MemberId { get; set; }
    public string MembershipNo { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string ScanUrl { get; set; } = string.Empty;
    public string QrCodeBase64 { get; set; } = string.Empty;
}
