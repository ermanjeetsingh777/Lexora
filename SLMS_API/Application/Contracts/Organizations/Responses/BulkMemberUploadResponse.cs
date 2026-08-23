namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class BulkMemberUploadResponse
{
    public int TotalRows { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public IReadOnlyCollection<BulkMemberUploadRowResult> Results { get; set; } = Array.Empty<BulkMemberUploadRowResult>();
}

public class BulkMemberUploadRowResult
{
    public int RowNumber { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? Message { get; set; }
    public Guid? MemberId { get; set; }
}
