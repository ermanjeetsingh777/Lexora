using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Organizations.Requests
{
    public class CreateMemberContactRequest
    {
        public string FullName { get; set; } = string.Empty;

        public string PhoneNumber { get; set; } = string.Empty;

        public string? Email { get; set; }

        public ContactRelation Relation { get; set; }

        public bool IsGuardian { get; set; }

        public bool IsEmergencyContact { get; set; }

        public bool IsPrimary { get; set; }
    }

    public class MemberContactResponse
    {
        public Guid Id { get; set; }

        public Guid MemberId { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string PhoneNumber { get; set; } = string.Empty;

        public string? Email { get; set; }

        public ContactRelation Relation { get; set; }

        public bool IsGuardian { get; set; }

        public bool IsEmergencyContact { get; set; }

        public bool IsPrimary { get; set; }

        public bool IsActive { get; set; }
    }
}
