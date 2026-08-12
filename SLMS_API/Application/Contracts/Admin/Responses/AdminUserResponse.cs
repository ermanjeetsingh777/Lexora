namespace SLMS_API.Application.Contracts.Admin.Responses;

public class AdminUserResponse
{
    public string Id { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? UserName { get; set; }
    public string? FullName { get; set; }
    public bool IsActive { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public IReadOnlyCollection<string> Roles { get; set; } = [];
    public DateTime CreatedAtUtc { get; set; }
}

