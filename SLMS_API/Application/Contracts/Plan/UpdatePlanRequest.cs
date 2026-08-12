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

        public bool IsActive { get; set; }
    }
}
