namespace SLMS_API.Domain.Entities
{
    public class UserInstitution
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string UserId { get; set; } = default!;
        public ApplicationUser User { get; set; } = default!;

        public Guid InstitutionId { get; set; }
        public Institution Institution { get; set; } = default!;

        public DateTime AssignedAtUtc { get; set; } = DateTime.UtcNow;

        public bool IsPrimary { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
