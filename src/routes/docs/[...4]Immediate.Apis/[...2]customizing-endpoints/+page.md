---
title: Customizing endpoints
---

# {$frontmatter.title}

## AsParameters

By default on POST and PUT requests Immediate.Apis will assume that your request class should be treated as a `[FromBody]`. Sometimes, however, this is not desired. For example imagine a PUT request that sits at a route `/api/todos/{id}` and updates a TODO with a given ID. We would want to get the `id` from the route and the properties to update from the body. To do so, we need to create the following request command class:

```cs |copy|title=UpdateTodo.cs
public sealed record Command
{
    public sealed record CommandBody
    {
        // props here;
    }
    
    [FromRoute]
    public required int Id { get; init; }
    
    [FromBody]
    public required CommandBody Body { get; init; }
}
```

...and modify the `HandleAsync` method to let Immediate.Apis know we want to treat the outer `Command` class as `[AsParameters]`, like so:

```cs |copy|title=UpdateTodo.cs {2}
private static async ValueTask<Results<NoContent, NotFound>> HandleAsync(
    [AsParameters] Command command,
    ExampleDbContext dbContext,
    CancellationToken ct
) 
{
    // ...
}
```

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
    internal static void CustomizeEndpoint(IEndpointConventionBuilder endpoint)
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

## Transforming the handler result into a different type

In some cases, you may wish to transform the result of the handler into a different type; for example, you may wish to return a `Results<>` type which will work with asp.net core to return various status codes. 

You can transform the result of your handler into a different type by adding a `TransformResult` method, like so:

```cs |copy|title=GetUsersQuery.cs {5-8}
[Handler]
[MapGet("/users")]
[Authorize(Policies.UserManagement)]
public static partial class GetUsersQuery
{
    internal static Results<Ok<IEnumerable<User>>, NotFound> TransformResult(IEnumerable<User> result)
    {
        return TypedResults.Ok(result);
    }

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
