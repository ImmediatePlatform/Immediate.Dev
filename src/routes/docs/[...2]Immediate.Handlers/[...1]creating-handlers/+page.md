---
title: Creating handlers
description: Learn how to create handlers
---

# {$frontmatter.title}

Handlers can be created by using the following code:

```cs
[Handler]
public static partial class GetUsersQuery
{
    public record Query;

    private static ValueTask<IEnumerable<User>> HandleAsync(
        Query _,
        UsersService usersService,
        CancellationToken token
	)
    {
        return usersService.GetUsers();
    }
}
```

This will automatically generate a new class, `GetUsersQuery.Handler`, which encapsulates the following:

- attaching any behaviors which may be relevant for the query
- using a class to receive any DI services, such as `UsersService`

Consuming code can now do the following:

```cs
public class Consumer(GetUsersQuery.Handler handler)
{
	public async Task Consumer(CancellationToken token)
	{
		var response = await handler.HandleAsync(new(), token);
		// do something with response
	}
}
```

For Command handlers, use a `ValueTask`, and Immediate.Handlers will insert a return type
of `ValueTuple` to your handler automatically.

```cs
[Handler]
public static partial class CreateUserCommand
{
    public record Command(string Email);

    private static async ValueTask HandleAsync(
        Command command,
        UsersService usersService,
        CancellationToken token
	)
    {
        await usersService.CreateUser(command.Email);
    }
}

public class Consumer(CreateUserCommand.Handler handler)
{
	public async Task Consumer(CancellationToken token)
	{
		await handler.HandleAsync(new(), token);
		// do something with response
	}
}
```

`CancellationTokens` are also optional, and may be omitted if unnecessary. 

```cs
[Handler]
public static partial class GetHelloResponse
{
    public record Query(string Name);

    private static ValueTask<string> Handle(Query query)
    {
        return ValueTask.FromResult($"Hello {query.Name}!");
    }
}
```

In case your project layout does not allow direct for references between consumer and handler, the handler will implement the `IHandler<TRequest, Response>` interface.

```cs
public class Consumer(IHandler<GetUsersQuery.Query, IEnumerable<User>> handler)
{
	public async Task Consumer(CancellationToken token)
	{
		var response = await handler.HandleAsync(new(), token);
		// do something with response
	}
}
```

## Registering with `IServiceCollection`

Immediate.Handlers supports `Microsoft.Extensions.DependencyInjection.Abstractions` directly. To register handlers with DI, simply add the following to your `Program.cs`:

In your `Program.cs`, add a call to `services.AddXxxHandlers()`, where `Xxx` is the shortened form of the project name.
* For a project named `Web`, it will be `services.AddWebHandlers()`
* For a project named `Application.Web`, it will be `services.AddApplicationWebHandlers()`

This registers all handlers in the assembly marked with `[Handler]`, along with their `IHandler<TRequest, TResponse>` interface.
