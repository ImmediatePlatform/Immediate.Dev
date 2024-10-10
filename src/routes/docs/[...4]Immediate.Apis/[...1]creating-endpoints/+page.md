---
title: Creating endpoints
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

In order for the endpoints to be seen by ASP.NET Core, they must be registered inside your `Program.cs`, by calling `app.MapXxxEndpoints()`, where `Xxx` is the shortened form of the project name.

- For a project named Web, it will be app.MapWebEndpoints()
- For a project named Application.Web, it will be app.MapApplicationWebEndpoints()
