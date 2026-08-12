using FluentValidation;
using SLMS_API.Application.Contracts.Auth.Requests;

namespace SLMS_API.Application.Validation.Auth;

public class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}
