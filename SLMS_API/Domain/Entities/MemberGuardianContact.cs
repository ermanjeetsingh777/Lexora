using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities
{
    public class MemberGuardianContact : AuditableEntity
    {
        public Guid Id { get; set; }

        public Guid MemberId { get; set; }
        public Member Member { get; set; } = default!;

        public string FullName { get; set; } = string.Empty;

        public string PhoneNumber { get; set; } = string.Empty;

        public string? Email { get; set; }

        public ContactRelation Relation { get; set; }

        public bool IsGuardian { get; set; }

        public bool IsEmergencyContact { get; set; }

        public bool IsPrimary { get; set; }

    }
}
