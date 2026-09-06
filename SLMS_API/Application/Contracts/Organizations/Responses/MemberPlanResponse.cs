namespace SLMS_API.Application.Contracts.Organizations.Responses
{
    public class MemberPlanResponse
    {
        public Guid Id { get; set; }
        public Guid PlanId { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int DurationInDays { get; set; }
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal? AdjustmentAmount { get; set; }
        public decimal DueAmount { get; set; }
        public string? PaymentStatus { get; set; }
        public string? PaymentMethod { get; set; }
        public bool IsCurrent { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
