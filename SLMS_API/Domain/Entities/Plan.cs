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

        /// <summary>Daily attendance window start (member late/overtime measured against this).</summary>
        public TimeOnly? StartTime { get; set; }

        /// <summary>Daily attendance window end.</summary>
        public TimeOnly? EndTime { get; set; }

        /// <summary>Minutes after StartTime before check-in counts as late (default 10).</summary>
        public int GraceMinutes { get; set; } = 10;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAtUtc { get; set; }

        public ICollection<MemberPlan> MemberPlans { get; set; } = new List<MemberPlan>();
    }
}
