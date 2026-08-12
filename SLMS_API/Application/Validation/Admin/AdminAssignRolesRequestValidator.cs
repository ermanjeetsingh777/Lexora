using FluentValidation;
using SLMS_API.Application.Contracts.Admin.Requests;

namespace SLMS_API.Application.Validation.Admin;

public class AdminAssignRolesRequestValidator : AbstractValidator<AdminAssignRolesRequest>
{
    public AdminAssignRolesRequestValidator()
    {
        RuleFor(x => x.Roles).NotNull();
        RuleForEach(x => x.Roles).NotEmpty().MaximumLength(256);
    }
}

