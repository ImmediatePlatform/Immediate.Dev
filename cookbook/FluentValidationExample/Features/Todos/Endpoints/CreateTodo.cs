using FluentValidation;
using FluentValidationExample.Database;
using FluentValidationExample.Features.Todos.Models;
using Immediate.Apis.Shared;
using Immediate.Handlers.Shared;
using Microsoft.AspNetCore.Http.HttpResults;

namespace FluentValidationExample.Features.Todos.Endpoints;

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

    private static async ValueTask<Created<Todo>> HandleAsync(Command command, ExampleDbContext dbContext, CancellationToken ct)
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