using FluentValidation;
using SLMS_API.Application.Contracts.Admin.Requests;

namespace SLMS_API.Application.Validation.Admin;

public class AdminAssignRolePermissionsRequestValidator : AbstractValidator<AdminAssignRolePermissionsRequest>
{
    public AdminAssignRolePermissionsRequestValidator()
    {
        RuleFor(x => x.Permissions).NotNull();
        RuleForEach(x => x.Permissions).IsInEnum();
    }
}
