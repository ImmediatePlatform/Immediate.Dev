using FluentValidation;
using Immediate.Handlers.Shared;

namespace FluentValidationExample.Infrastructure.Behaviors;

public sealed class ValidationBehavior<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators
) : Behavior<TRequest, TResponse>
{
    public override async ValueTask<TResponse> HandleAsync(TRequest request, CancellationToken cancellationToken)
    {
        var context = new ValidationContext<TRequest>(request);
        var failures = validators
            .Select(x => x.Validate(context))
            .SelectMany(x => x.Errors)
            .Where(x => x is not null)
            .ToList();

        if (failures.Any())
        {
            throw new ValidationException(failures);
        }

        return await Next(request, cancellationToken).ConfigureAwait(false);
    }
}