using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities
{
    public class MemberPlan : AuditableEntity
    {
        public Guid Id { get; set; }
        public Guid MemberId { get; set; }
        public Member Member { get; set; } = default!;
        public Guid PlanId { get; set; }
        public Plan Plan { get; set; } = default!;
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        public decimal Amount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal? AdjustmentAmount { get; set; }
        public bool IsCurrent { get; set; }
    }
}
