using FluentValidationExample.Database;
using FluentValidationExample.Features.Todos.Models;
using Immediate.Apis.Shared;
using Immediate.Handlers.Shared;
using Microsoft.EntityFrameworkCore;

namespace FluentValidationExample.Features.Todos.Endpoints;

[Handler]
[MapGet("/api/todos")]
public static partial class GetTodos
{
    public record struct Query;

    private static async ValueTask<IReadOnlyList<Todo>> HandleAsync(Query _, ExampleDbContext dbContext, CancellationToken ct)
        => await dbContext.Todos
            .Select(x => x.ToDto())
            .ToListAsync(ct);
}