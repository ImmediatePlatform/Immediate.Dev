[Handler]
[MapGet("/api/todos")]
public static partial class GetTodos
{
    public sealed record Query(bool ShowCompleted = false);

    private static async ValueTask<IReadOnlyList<Todo>> HandleAsync(
        Query query,
        ExampleDbContext dbContext,
        CancellationToken ct
    )
    {
        var todosQuery = dbContext.Todos.AsQueryable();

        if (query.ShowCompleted)
        {
            todosQuery = todosQuery.Where(x => x.IsCompleted);
        }
        
        return await todosQuery
            .Select(x => x.ToDto())
            .ToListAsync(ct);
    }
}