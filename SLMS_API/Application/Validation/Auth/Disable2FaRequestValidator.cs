using FluentValidation;
using SLMS_API.Application.Contracts.Auth.Requests;

namespace SLMS_API.Application.Validation.Auth;

public class Disable2FaRequestValidator : AbstractValidator<Disable2FaRequest>
{
    public Disable2FaRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().Length(6);
    }
}
