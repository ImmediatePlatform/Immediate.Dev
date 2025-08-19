[Command]
public class RootCommand(GetRandomNumber.Handler getRandomNumberQuery) : ICommand
{
    public async ValueTask ExecuteAsync(IConsole console)
    {
        var randomNumber = await getRandomNumberQuery.HandleAsync(new());
        
        console.Output.WriteLine(randomNumber);
        
        return default;
    }
}