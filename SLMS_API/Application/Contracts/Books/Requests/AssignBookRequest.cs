namespace SLMS_API.Application.Contracts.Books.Requests;

public class AssignBookRequest
{
    public Guid TargetInstitutionId { get; set; }
    public Guid TargetBranchId { get; set; }
    public Guid TargetLibraryId { get; set; }
}
