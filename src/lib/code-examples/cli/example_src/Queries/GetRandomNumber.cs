[Handler]
public static partial class GetRandomNumber
{
    public sealed record Query;

    private static ValueTask<int> HandleAsync(Query query, CancellationToken token)
        => ValueTask.FromResult(Random.Shared.Next());
}