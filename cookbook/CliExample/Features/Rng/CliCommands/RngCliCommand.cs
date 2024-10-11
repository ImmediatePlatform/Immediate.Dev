using CliExample.Features.Rng.Queries;
using CliFx;
using CliFx.Attributes;
using CliFx.Infrastructure;

namespace CliExample.Features.Rng.CliCommands;

[Command]
public class RngCliCommand(Get.Handler getQuery) : ICommand
{
    public ValueTask ExecuteAsync(IConsole console)
    {
        var randomNumber = getQuery.HandleAsync(new());

        console.Output.WriteLine(randomNumber);

        return default;
    }
}