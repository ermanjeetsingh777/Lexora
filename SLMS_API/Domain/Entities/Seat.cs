namespace SLMS_API.Domain.Entities
{
    public class Seat
    {
        public Guid Id { get; set; }

        public Guid LibraryId { get; set; }

        public string SeatNumber { get; set; } = string.Empty;

        public bool IsActive { get; set; }

        public ICollection<MemberLibrary> MemberLibraries { get; set; } = new List<MemberLibrary>();
    }
}
