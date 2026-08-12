namespace SLMS_API.Domain.Entities
{
    public class MemberTransferHistory
    {
        public Guid Id { get; set; }

        public Guid MemberId { get; set; }

        public Guid FromInstitutionId { get; set; }

        public Guid FromBranchId { get; set; }

        public Guid FromLibraryId { get; set; }

        public Guid? FromSeatId { get; set; }

        public Guid ToInstitutionId { get; set; }

        public Guid ToBranchId { get; set; }

        public Guid ToLibraryId { get; set; }

        public Guid? ToSeatId { get; set; }

        public string? Reason { get; set; }

        public DateTime TransferDate { get; set; }

        public string TransferredByUserId { get; set; } = string.Empty;
    }
}
