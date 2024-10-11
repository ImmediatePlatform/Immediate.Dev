using FluentValidationExample.Infrastructure.Behaviors;
using Immediate.Handlers.Shared;

[assembly: Behaviors(
    typeof(ValidationBehavior<,>)
)]