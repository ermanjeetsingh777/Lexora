namespace SLMS_API.Domain.Entities
{
    public class UserLibrary
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string UserId { get; set; } = default!;
        public ApplicationUser User { get; set; } = default!;

        public Guid InstitutionId { get; set; }
        public Institution Institution { get; set; } = default!;

        public Guid BranchId { get; set; }
        public Branch Branch { get; set; } = default!;

        public Guid LibraryId { get; set; }
        public Library Library { get; set; } = default!;

        public DateTime AssignedAtUtc { get; set; } = DateTime.UtcNow;

        public bool IsPrimary { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
