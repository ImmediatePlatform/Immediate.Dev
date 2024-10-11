using Immediate.Apis.Shared;
using Immediate.Handlers.Shared;
using Immediate.Validations.Shared;
using Microsoft.AspNetCore.Http.HttpResults;
using WebApiExample.Database;
using WebApiExample.Features.Todos.Models;

namespace WebApiExample.Features.Todos.Endpoints;

[Handler]
[MapPost("/api/todos")]
public static partial class CreateTodo
{
    [Validate]
    public sealed partial record Command : IValidationTarget<Command>
    {
        [NotEmpty]
        [MaxLength(64)]
        public string Name { get; init; } = null!;
        
        [MaxLength(4096)]
        public string? Description { get; init; }
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