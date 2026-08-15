using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities
{
    public class Member : AuditableEntity
    {
        public Guid Id { get; set; }

        public string UserId { get; set; } = string.Empty;
        public ApplicationUser User { get; set; } = default!;

        public string MembershipNo { get; set; } = string.Empty;

        public DateOnly? DateOfBirth { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;

        public string? PhotoStoragePath { get; set; }
        public string? PhotoFileName { get; set; }

        public string? Gender { get; set; }
        public string Shift { get; set; } = string.Empty;

        public ICollection<MemberGuardianContact> MemberGuardianContacts { get; set; } = new List<MemberGuardianContact>();

        public ICollection<MemberLibrary> MemberLibraries { get; set; } = new List<MemberLibrary>();

        public ICollection<MemberPlan> MemberPlans { get; set; } = new List<MemberPlan>();

        public ICollection<MemberAttendance> Attendances { get; set; } = new List<MemberAttendance>();

        public ICollection<MemberTransferHistory> Transfers { get; set; } = new List<MemberTransferHistory>();
    }
}
