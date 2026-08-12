namespace SLMS_API.Domain.Entities
{
    public class Plan
    {
        public Guid Id { get; set; }

        public Guid InstitutionId { get; set; }
        public Institution Institution { get; set; } = default!;

        public Guid BranchId { get; set; }
        public Branch Branch { get; set; } = default!;

        public Guid LibraryId { get; set; }
        public Library Library { get; set; } = default!;

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public decimal Price { get; set; }

        // e.g. 30, 90, 180, 365
        public int DurationInDays { get; set; }

        // Optional
        public int? MaxSeats { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAtUtc { get; set; }

        public ICollection<MemberPlan> MemberPlans { get; set; } = new List<MemberPlan>();
    }
}
