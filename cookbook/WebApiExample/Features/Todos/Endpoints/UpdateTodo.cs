using Immediate.Apis.Shared;
using Immediate.Handlers.Shared;
using Immediate.Validations.Shared;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApiExample.Database;

namespace WebApiExample.Features.Todos.Endpoints;

[Handler]
[MapPut("/api/todos/{id}")]
public static partial class UpdateTodo
{
    [Validate]
    public sealed partial record Command : IValidationTarget<Command>
    {
        [Validate]
        public sealed partial record CommandBody : IValidationTarget<CommandBody>
        {
            // TODO: https://github.com/ImmediatePlatform/Immediate.Validations/issues/123
            public bool IsCompleted { get; init; }
        
            [NotEmpty]
            [MaxLength(64)]
            public string Name { get; init; } = null!;
        
            [MaxLength(4096)]
            public string? Description { get; init; }   
        }
        
        [FromRoute]
        [GreaterThan(0)]
        public required int Id { get; init; }
        
        [FromBody]
        public required CommandBody Body { get; init; }
    }

    private static async ValueTask<Results<NoContent, NotFound>> HandleAsync([AsParameters] Command command, ExampleDbContext dbContext, CancellationToken ct)
    {
        var todo = await dbContext.Todos
            .FirstOrDefaultAsync(x => x.Id == command.Id, ct);

        if (todo is null)
            return TypedResults.NotFound();

        todo.IsCompleted = command.Body.IsCompleted;
        todo.Name = command.Body.Name;
        todo.Description = command.Body.Description;
        
        await dbContext.SaveChangesAsync(ct);

        return TypedResults.NoContent();
    }
}