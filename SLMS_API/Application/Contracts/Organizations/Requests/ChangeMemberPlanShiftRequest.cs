namespace SLMS_API.Application.Contracts.Organizations.Requests
{
    public class ChangeMemberPlanShiftRequest
    {
        public Guid? PlanId { get; set; }

        public string? Shift { get; set; } = string.Empty;

        /// <summary>Optional plan start. Default = today (UTC).</summary>
        public DateTime? StartDate { get; set; }

        /// <summary>Optional plan end. If omitted, start + selected plan duration.</summary>
        public DateTime? EndDate { get; set; }
    }
}
