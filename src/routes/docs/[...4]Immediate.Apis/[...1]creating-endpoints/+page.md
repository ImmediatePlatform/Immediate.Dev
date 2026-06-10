---
title: Creating endpoints
description: Learn how to create endpoints
---

# {$frontmatter.title}

Any `Immediate.Handlers` handler can be transformed into an endpoint by appending a `MapX` attribute (`MapGet`, `MapPost`, etc.), like so:

```cs |copy|title=GetUsersQuery.cs {2}
[Handler]
[MapGet("/users")]
public static partial class GetUsersQuery
{
    public record Query;

    private static ValueTask<IEnumerable<User>> HandleAsync(
        Query _,
        UsersService usersService,
        CancellationToken token)
    {
        return usersService.GetUsers();
    }
}
```

## Registering the endpoints

In your `Program.cs`, add a call to `app.MapXxxEndpoints()`, where `Xxx` is the application identifier.
By default, this is the short form of the assembly name. For example:
* For a project named `Web`, it will be `app.MapWebEndpoints()`
* For a project named `Application.Web`, it will be `app.MapApplicationWebEndpoints()`

However, this name can be overridden using `[assembly: ImmediateAssemblyIdentifier("SomeIdentifier")]`.
