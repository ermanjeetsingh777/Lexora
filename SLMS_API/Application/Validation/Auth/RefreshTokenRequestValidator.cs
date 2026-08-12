using FluentValidation;
using SLMS_API.Application.Contracts.Auth.Requests;

namespace SLMS_API.Application.Validation.Auth;

public class RefreshTokenRequestValidator : AbstractValidator<RefreshTokenRequest>
{
    public RefreshTokenRequestValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty();
    }
}
