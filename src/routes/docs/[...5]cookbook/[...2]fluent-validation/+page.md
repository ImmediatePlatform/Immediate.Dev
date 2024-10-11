---
title: FluentValidation Integration
---

# {$frontmatter.title}

<script>
    import GitHubButton from '$lib/components/GitHubButton.svelte';
    import Divider from '$lib/components/Divider.svelte';
</script>

In this example we will show how to integrate Immediate.Handlers and Immediate.Apis with FluentValidation, a popular validation library for .NET that can be used as an alternative for Immediate.Validations. This example is particularly useful for projects that already contain a significant amount of FluentValidation code but want to make use of the other ImmediatePlatform libraries.

The example is structured in a tutorial form that will teach you how to add FluentValidation to an exisiting Todo Web API, similar to our [Web API cookbook example](/docs/cookbook/web-api). The example can be adapted to any other type of application that allows for intercepting exceptions (e.g. Blazor apps, Discord bots and so on).

If you prefer to skip the tutorial and just view the source code for this example, it is hosted on GitHub and can be viewed at any time.

<GitHubButton link="https://github.com/ImmediatePlatform/Immediate.Dev/tree/main/cookbook/FluentValidationExample" text="View example's source code on GitHub" />

<Divider />

## Tutorial

For the purposes of this tutorial, we will assume that you already have a Web API set up with the following endpoint:

```cs |copy|title="Features/Todos/CreateTodo.cs
[Handler]
[MapPost("/api/todos")]
public static partial class CreateTodo
{
    public sealed record Command
    {
        public string Name { get; init; } = null!;
        
        public string? Description { get; init; }
    }

    private static async ValueTask<Created<Todo>> HandleAsync(
        Command command,
        ExampleDbContext dbContext,
        CancellationToken ct
    )
    {
        var todo = new Database.Models.Todo
        {
            Name = command.Name,
            Description = command.Description
        };

        await dbContext.Todos.AddAsync(todo, cancellationToken: ct);
        await dbContext.SaveChangesAsync(ct);

        return TypedResults.Created($"/api/todos/{todo.Id}", todo.ToDto());
    }
}
```

:::steps

!!!step title="Add FluentValidation packages"

```bash |copy|title=terminal
dotnet add package FluentValidation
dotnet add package FluentValidation.DependencyInjectionExtensions
```

!!!

!!!step title="Add the validation behavior"

We will need to add a validation [behavior](/docs/Immediate.Handlers/creating-behaviors) that will run within the Immediate.Handlers pipeline and validate each incoming request (query/command) and throw a `ValidationException` on validation fail that we will later be able to intercept and handle.

📝 _<u>Note</u>_: Although the following example throws a `ValidationException`, it should not be overly difficult to adapt it to use a `Result<T>` type from a results library of your choice. As a helpful pointer, to get started you would need to constrain the TResponse to an `IResult`.

```cs |copy|title=Infrastructure/Behaviors/ValidationBehavior
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
```

!!!

!!!step title="Register the behavior"

To register the behavior, either create an `AssemblyAttributes.cs` file at the root of your project if it does not already exist, with the following contents, or add just the ValidationBehavior to your existing `AssemblyAttributes.cs` like so:

```cs |copy|title=AssemblyAttributes.cs {3-5}
using FluentValidationExample.Infrastructure.Behaviors; // your namespace here;
using Immediate.Handlers.Shared;

[assembly: Behaviors(
    typeof(ValidationBehavior<,>)
)]
```

If you don't already have behaviors registered in your `Program.cs`, add the following:

```cs |copy|title=Program.cs
// rest of Program.cs omitted for brevity
builder.Services.AddBehaviors();
```

!!!

!!!step title="Add a validator to the endpoint"

Now that we have the behavior infrastructure in place, we can add a FluentValidator validator to our `CreateTodo` endpoint.

```cs |copy|title="Features/Todos/CreateTodo.cs {9-18}
[Handler]
[MapPost("/api/todos")]
public static partial class CreateTodo
{
    public sealed record Command
    {
        public string Name { get; init; } = null!;        
        public string? Description { get; init; }
    }

    public sealed class CommandValidator : AbstractValidator<Command>
    {
        public CommandValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty()
                .MaximumLength(64);

            RuleFor(x => x.Description)
                .MaximumLength(4096);
        }
    }

    // rest of the endpoint omitted for brevity
    // ...
}
```

!!!

!!!step title="Register FluentValidation validators"

We have to register FluentValidation validators with DI so that they can be injected into the behavior when it runs. We can do this by adding the following to `Program.cs`:

```cs |copy|title=Program.cs
// rest of Program.cs omitted for brevity
builder.Services.AddValidatorsFromAssemblyContaining<CreateTodo.CommandValidator>();
```

This will automatically add all FluentValidation validators contained within the same assembly as `CreateTodo.CommandValidator` using assembly scanning. If your `Program` class sits within the same assembly as your validators you can also use `Program` as the generic type here.

!!!

!!!step title="Handle validation failures"

The result of a validation behavior running is that when a parameter fails one or more validations, a ValidationException is thrown, which can be handled via ProblemDetails or any other infrastructure mechanism. In the following example we will use `ProblemDetails` as we are in the context of a Web API.

Add the following to your `Program.cs`:

```cs |copy|title=Program.cs
// rest of Program.cs omitted for brevity

builder.Services.AddProblemDetails(options =>
    options.CustomizeProblemDetails = c =>
    {
        if (c.Exception is null)
            return;

        c.ProblemDetails = c.Exception switch
        {
            ValidationException ex => new ValidationProblemDetails(
                ex
                    .Errors
                    .GroupBy(x => x.PropertyName, StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(
                        x => x.Key,
                        x => x.Select(e => e.ErrorMessage).ToArray(),
                        StringComparer.OrdinalIgnoreCase
                    )
            )
            {
                Status = StatusCodes.Status400BadRequest,
            },

            // other exception handling as desired goes here

            _ => new ProblemDetails
            {
                Detail = "An error has occurred.",
                Status = StatusCodes.Status500InternalServerError,
            },
        };

        c.HttpContext.Response.StatusCode = c.ProblemDetails.Status ?? StatusCodes.Status500InternalServerError;
    });
```

!!!

:::

Now whenever you make an invalid request to any of the endpoints, a `ProblemDetails` detailing all the validation errors will be returned, alongside a `400 Bad Request` status code.
