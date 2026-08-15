using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class UserNotification : AuditableEntity
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public Guid? MemberId { get; set; }
    public Guid? BookLoanId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string NotificationType { get; set; } = string.Empty;
    public bool IsRead { get; set; }
}
