using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities
{
    public class MemberLibrary : AuditableEntity
    {
        public Guid Id { get; set; }

        public Guid MemberId { get; set; }
        public Member Member { get; set; } = default!;

        public Guid InstitutionId { get; set; }
        public Institution Institution { get; set; } = default!;

        public Guid BranchId { get; set; }
        public Branch Branch { get; set; } = default!;

        public Guid LibraryId { get; set; }
        public Library Library { get; set; } = default!;

        public Guid? SeatId { get; set; }
        public Seat? Seat { get; set; }

        public bool IsCurrent { get; set; }

        public DateTime JoinedOn { get; set; } = DateTime.UtcNow;

        public DateTime? LeftOn { get; set; }
    }
}
