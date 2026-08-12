using FluentValidation;
using SLMS_API.Application.Contracts.Auth.Requests;

namespace SLMS_API.Application.Validation.Auth;

public class VerifyOtpRequestValidator : AbstractValidator<VerifyOtpRequest>
{
    public VerifyOtpRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Code).NotEmpty().Length(6);
        RuleFor(x => x.Purpose).IsInEnum();
    }
}
