namespace SLMS_API.Application.Contracts.Admin.Requests;

public class AdminUserInstitutionScopeRequest
{
    public Guid InstitutionId { get; set; }
    public IReadOnlyCollection<Guid>? BranchIds { get; set; }
    public IReadOnlyCollection<Guid>? LibraryIds { get; set; }
}
