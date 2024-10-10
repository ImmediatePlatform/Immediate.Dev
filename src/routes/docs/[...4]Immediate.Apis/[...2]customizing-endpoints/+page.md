---
title: Customizing endpoints
---

# {$frontmatter.title}

## Authorization

The `[AllowAnonymous]` and `[Authorized("Policy")]` attributes are supported and will be applied to the endpoint.

```cs |copy|title=GetUsersQuery.cs {3}
[Handler]
[MapGet("/users")]
[AllowAnonymous]
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

## Additional customization

Additional customization of the endpoint registration can be done by adding a `CustomizeEndpoint` method, like so:

```cs |copy|title=GetUsersQuery.cs {5-9}
[Handler]
[MapGet("/users")]
[Authorize(Policies.UserManagement)]
public static partial class GetUsersQuery
{
    internal static void CustomizeGetFeaturesEndpoint(IEndpointConventionBuilder endpoint)
        => endpoint
            .Produces<IEnumerable<User>>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithTags(nameof(User));

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
