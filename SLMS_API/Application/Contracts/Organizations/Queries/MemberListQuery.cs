namespace SLMS_API.Application.Contracts.Organizations.Queries;

/// <summary>
/// Server-side paging / filter / sort for GET api/v1/members.
/// </summary>
public class MemberListQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;

    /// <summary>Name, email, phone, membership no, institution/branch/library.</summary>
    public string? Search { get; set; }

    /// <summary>Comma-separated: Active, Inactive.</summary>
    public string? Statuses { get; set; }

    /// <summary>Comma-separated branch names.</summary>
    public string? Branches { get; set; }

    /// <summary>Comma-separated shift names.</summary>
    public string? Shifts { get; set; }

    /// <summary>Comma-separated plan names; use "No plan" for members without a current plan.</summary>
    public string? Plans { get; set; }

    /// <summary>Comma-separated library names (scoped panels).</summary>
    public string? Libraries { get; set; }

    /// <summary>Comma-separated lifecycle: Active, Expiring soon, Grace, Expired, No plan.</summary>
    public string? Lifecycles { get; set; }

    public bool NeedsAction { get; set; }

    /// <summary>name | status | branch | shift | plan | planExpiry | joinDate | feesOwed | attendanceRate</summary>
    public string? SortBy { get; set; } = "planExpiry";

    /// <summary>asc | desc</summary>
    public string? SortDir { get; set; } = "asc";
}
