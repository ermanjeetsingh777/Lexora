namespace SLMS_API.Application.Contracts.Plan
{
    public class CreatePlanRequest
    {
        public Guid InstitutionId { get; set; }

        public Guid BranchId { get; set; }

        public Guid LibraryId { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public decimal Price { get; set; }

        public int DurationInDays { get; set; }

        public int? MaxSeats { get; set; }

        /// <summary>HH:mm — defaults to library hours when omitted.</summary>
        public TimeOnly? StartTime { get; set; }

        /// <summary>HH:mm — defaults to library hours when omitted.</summary>
        public TimeOnly? EndTime { get; set; }

        public int? GraceMinutes { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
