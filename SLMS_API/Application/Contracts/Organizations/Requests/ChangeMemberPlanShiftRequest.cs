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

        /// <summary>Optional amount actually paid. Default = plan price (minus adjustment on change).</summary>
        public decimal? PaidAmount { get; set; }

        /// <summary>Manual outstanding due. Plan − Paid without Due becomes Adjustment (discount), not due.</summary>
        public decimal? DueAmount { get; set; }

        /// <summary>When set (with or without plan change), apply this payment against current DueAmount.</summary>
        public decimal? PayDueAmount { get; set; }
    }
}
