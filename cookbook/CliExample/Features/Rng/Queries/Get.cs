using CliExample.Features.Rng.Models;
using Immediate.Handlers.Shared;

namespace CliExample.Features.Rng.Queries;

[Handler]
public static partial class Get
{
    public record struct Query;

    private static ValueTask<RngResult> HandleAsync(Query _, CancellationToken ct)
    {
        var randomNumber = Random.Shared.Next();
        var rngResult = new RngResult(randomNumber);

        return ValueTask.FromResult(rngResult);
    }
}