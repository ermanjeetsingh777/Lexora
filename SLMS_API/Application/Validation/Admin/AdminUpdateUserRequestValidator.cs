using FluentValidation;
using SLMS_API.Application.Contracts.Admin.Requests;

namespace SLMS_API.Application.Validation.Admin;

public class AdminUpdateUserRequestValidator : AbstractValidator<AdminUpdateUserRequest>
{
    public AdminUpdateUserRequestValidator()
    {
        RuleFor(x => x.FullName).MaximumLength(100);
    }
}

