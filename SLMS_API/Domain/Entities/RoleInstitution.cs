namespace SLMS_API.Domain.Entities;

public class RoleInstitution
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RoleId { get; set; } = default!;
    public Guid InstitutionId { get; set; }
    public string? CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Institution? Institution { get; set; }
}
