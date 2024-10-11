using Immediate.Apis.Shared;
using Immediate.Handlers.Shared;
using Immediate.Validations.Shared;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApiExample.Database;
using WebApiExample.Features.Todos.Models;

namespace WebApiExample.Features.Todos.Endpoints;

[Handler]
[MapGet("/api/todos/{id}")]
public static partial class GetTodo
{
    [Validate]
    public sealed partial record Query : IValidationTarget<Query>
    {
        [FromRoute]
        [GreaterThan(0)]
        public required int Id { get; init; }
    }

    private static async ValueTask<Results<Ok<Todo>, NotFound>> HandleAsync(Query query, ExampleDbContext dbContext, CancellationToken ct)
    {
        var todo = await dbContext.Todos
            .FirstOrDefaultAsync(x => x.Id == query.Id, ct);

        return todo is not null
            ? TypedResults.Ok(todo.ToDto())
            : TypedResults.NotFound();
    }
}