using FluentValidation;
using SLMS_API.Application.Contracts.Auth.Requests;

namespace SLMS_API.Application.Validation.Auth;

public class LogoutRequestValidator : AbstractValidator<LogoutRequest>
{
    public LogoutRequestValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty();
    }
}
