namespace SLMS_API.Application.Contracts.Plan
{
    public class UpdatePlanRequest
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public decimal Price { get; set; }

        public int DurationInDays { get; set; }

        public int? MaxSeats { get; set; }

        public TimeOnly? StartTime { get; set; }

        public TimeOnly? EndTime { get; set; }

        public int? GraceMinutes { get; set; }

        public bool IsActive { get; set; }
    }
}
