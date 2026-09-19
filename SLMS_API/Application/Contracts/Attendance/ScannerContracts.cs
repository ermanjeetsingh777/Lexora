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
    /// <summary>check-in | check-out | done | blocked</summary>
    public string SuggestedAction { get; set; } = "check-in";
    public TimeOnly? CheckInTime { get; set; }
    public TimeOnly? CheckOutTime { get; set; }
    public DateTime? CheckInAtUtc { get; set; }
    public DateTime? CheckOutAtUtc { get; set; }
    public string? SeatNumber { get; set; }
    /// <summary>Active | Grace | Expired | No plan | …</summary>
    public string? PlanLifecycle { get; set; }
    /// <summary>Set when SuggestedAction is blocked (expired past grace / no plan).</summary>
    public string? PlanBlockMessage { get; set; }
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
    /// <summary>Seat permanently assigned on the member's current library enrollment.</summary>
    public string? AssignedSeatNumber { get; set; }
    public string? LibraryAddress { get; set; }

    /// <summary>Active / Grace / Expired / No plan — same as scanner status.</summary>
    public string? PlanLifecycle { get; set; }

    /// <summary>Set when check-in is blocked (Expired past grace, or No plan).</summary>
    public string? PlanBlockMessage { get; set; }

    /// <summary>True when QR / staff check-in must be refused until renew.</summary>
    public bool CheckInBlocked { get; set; }
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

public class AttendanceSeatOptionResponse
{
    public Guid? SeatId { get; set; }
    public string SeatNumber { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool IsOccupied { get; set; }
    public string? OccupiedBy { get; set; }
    public string? LastVacatedBy { get; set; }
    public DateTime? LastVacatedAtUtc { get; set; }
}
