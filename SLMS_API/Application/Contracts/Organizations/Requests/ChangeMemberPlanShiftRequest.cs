namespace SLMS_API.Application.Contracts.Organizations.Requests
{
    public class ChangeMemberPlanShiftRequest
    {
        public Guid? PlanId { get; set; }

        public string? Shift { get; set; } = string.Empty;
    }
}
