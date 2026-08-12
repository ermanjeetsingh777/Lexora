using FluentValidation;
using SLMS_API.Application.Contracts.Admin.Requests;

namespace SLMS_API.Application.Validation.Admin;

public class AdminCreateRoleRequestValidator : AbstractValidator<AdminCreateRoleRequest>
{
    public AdminCreateRoleRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(256);
    }
}

