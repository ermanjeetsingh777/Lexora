using FluentValidation;
using SLMS_API.Application.Contracts.Organizations.Requests;

namespace SLMS_API.Application.Validation.Organizations;

public class CreateInstitutionRequestValidator : AbstractValidator<CreateInstitutionRequest>
{
    public CreateInstitutionRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Phone).MaximumLength(20);
        RuleFor(x => x.Type).MaximumLength(50);
    }
}

public class UpdateInstitutionRequestValidator : AbstractValidator<UpdateInstitutionRequest>
{
    public UpdateInstitutionRequestValidator()
    {
        RuleFor(x => x.Name).MaximumLength(255).When(x => x.Name is not null);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
    }
}

public class CreateBranchRequestValidator : AbstractValidator<CreateBranchRequest>
{
    public CreateBranchRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Capacity).GreaterThan(0).When(x => x.Capacity.HasValue);
    }
}

public class UpdateBranchRequestValidator : AbstractValidator<UpdateBranchRequest>
{
    public UpdateBranchRequestValidator()
    {
        RuleFor(x => x.Name).MaximumLength(255).When(x => x.Name is not null);
        RuleFor(x => x.Capacity).GreaterThan(0).When(x => x.Capacity.HasValue);
    }
}

public class CreateLibraryRequestValidator : AbstractValidator<CreateLibraryRequest>
{
    public CreateLibraryRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Capacity).GreaterThan(0).When(x => x.Capacity.HasValue);
        RuleFor(x => x.Floor).GreaterThanOrEqualTo(0).When(x => x.Floor.HasValue);
    }
}

public class UpdateLibraryRequestValidator : AbstractValidator<UpdateLibraryRequest>
{
    public UpdateLibraryRequestValidator()
    {
        RuleFor(x => x.Name).MaximumLength(255).When(x => x.Name is not null);
        RuleFor(x => x.Capacity).GreaterThan(0).When(x => x.Capacity.HasValue);
        RuleFor(x => x.Floor).GreaterThanOrEqualTo(0).When(x => x.Floor.HasValue);
    }
}
