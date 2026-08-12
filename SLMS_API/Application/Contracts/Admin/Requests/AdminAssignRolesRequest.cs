namespace SLMS_API.Application.Contracts.Admin.Requests;

public class AdminAssignRolesRequest
{
    public IReadOnlyCollection<string> Roles { get; set; } = [];
}

