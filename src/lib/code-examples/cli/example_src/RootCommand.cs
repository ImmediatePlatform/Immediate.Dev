[Command]
public class RootCommand(GetRandomNumber.Handler getRandomNumberQuery) : ICommand
{
    public ValueTask ExecuteAsync(IConsole console)
    {
        var randomNumber = getRandomNumberQuery.HandleAsync(new());
        
        console.Output.WriteLine(randomNumber);
        
        return default;
    }
}