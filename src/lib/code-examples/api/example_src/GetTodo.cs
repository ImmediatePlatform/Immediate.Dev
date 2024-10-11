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

    private static async ValueTask<Todo> HandleAsync(
        Query query,
        ExampleDbContext dbContext,
        CancellationToken ct
    ) => await dbContext.Todos
            .Where(t => t.Id == query.Id)
            .Select(t => t.ToDto())
            .FirstOrDefaultAsync();
}