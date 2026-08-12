using FluentValidation;
using SLMS_API.Application.Contracts.Admin.Requests;

namespace SLMS_API.Application.Validation.Admin;

public class AdminCreateUserRequestValidator : AbstractValidator<AdminCreateUserRequest>
{
    public AdminCreateUserRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.FullName).MaximumLength(100);
    }
}

