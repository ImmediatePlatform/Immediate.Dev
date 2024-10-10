---
title: Creating handlers
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

- attaching any behaviors defined for all queries in the assembly
- using a class to receive any DI services, such as `UsersService`

Any consumer can now do the following:

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
```

In case your project layout does not allow direct for references between consumer and handler, the handler will also be
registered as an `IHandler<TRequest, Response>`.

```cs
public class Consumer(IHandler<Query, IEnumerable<User>> handler)
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

```cs
services.AddHandlers();
```

This registers all classes in the assembly marked with `[Handler]`.
