using FluentValidation;
using FluentValidationExample.Database;
using FluentValidationExample.Features.Todos.Models;
using Immediate.Apis.Shared;
using Immediate.Handlers.Shared;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace FluentValidationExample.Features.Todos.Endpoints;

[Handler]
[MapGet("/api/todos/{id}")]
public static partial class GetTodo
{
    public sealed record Query
    {
        public required int Id { get; init; }
    }

    public sealed class QueryValidator : AbstractValidator<Query>
    {
        public QueryValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0);
        }
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