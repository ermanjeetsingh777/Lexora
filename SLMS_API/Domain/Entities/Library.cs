using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class Library : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();    
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Description { get; set; }
    public string? Address { get; set; }
    public int? Floor { get; set; }
    public int? Capacity { get; set; }
    public int DefaultLoanDays { get; set; } = 14;
    public decimal OverdueFinePerDay { get; set; } = 10m;
    /// <summary>Unique token embedded in the library's attendance QR code (common for all members).</summary>
    public string AttendanceQrToken { get; set; } = Guid.NewGuid().ToString("N");
    public InstitutionStatus Status { get; set; } = InstitutionStatus.Active;
    public Guid InstitutionId { get; set; }
    public Institution Institution { get; set; } = default!;
    public Guid BranchId { get; set; }
    public Branch? Branch { get; set; }
    public ICollection<UserLibrary> UserLibraries { get; set; } = [];
    public ICollection<Plan> Plans { get; set; } = new List<Plan>();
}
