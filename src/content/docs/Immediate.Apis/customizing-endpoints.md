---
title: Customizing endpoints
description: Add endpoint metadata with attributes or CustomizeEndpoint, and reshape the response with TransformResult.
order: 5
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

There are three ways to change what the generated endpoint looks like, from cheapest to most
powerful: attributes on your `Handle` method, a `CustomizeEndpoint` method, and a `TransformResult`
method.

## Attributes on the handle method

Every attribute you put on `Handle`/`HandleAsync` is copied onto the generated minimal-API delegate.
This is the shortest route to OpenAPI metadata:

```csharp title="GetUsers.cs" {7-8}
[Handler]
[MapGet("/users")]
public static partial class GetUsers
{
	public sealed record Query;

	[ProducesResponseType<IReadOnlyList<User>>(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	private static ValueTask<IReadOnlyList<User>> HandleAsync(
		Query _,
		UsersService usersService,
		CancellationToken token
	)
	{
		return usersService.GetUsersAsync(token);
	}
}
```

The generator emits these directly on the lambda:

```csharp
endpoint = app.MapGet(
	"/users",
	[ProducesResponseTypeAttribute<IReadOnlyList<User>>(200)]
	async (/* ... */) => { /* ... */ }
);
```

<Callout type="tip">

This is usually nicer than the equivalent `CustomizeEndpoint(e => e.Produces<T>())` call: it sits
next to the method whose return type it describes, and it survives refactoring better. Constructor
and named arguments are both carried across.

</Callout>

## `CustomizeEndpoint`

For anything that needs the builder — `WithDescription`, `WithName`, `RequireRateLimiting`, filters,
output caching — declare a `CustomizeEndpoint` method on the handler class. The generator calls it
once per registered route, after authorization conventions have been applied.

```csharp title="GetUsers.cs" {5-9}
[Handler]
[MapGet("/users")]
public static partial class GetUsers
{
	internal static void CustomizeEndpoint(RouteHandlerBuilder endpoint)
		=> endpoint
			.WithDescription("Returns every user")
			.ProducesValidationProblem()
			.ProducesProblem(StatusCodes.Status500InternalServerError);

	public sealed record Query;

	private static ValueTask<IReadOnlyList<User>> HandleAsync(
		Query _,
		UsersService usersService,
		CancellationToken token
	)
	{
		return usersService.GetUsersAsync(token);
	}
}
```

The method must be:

| Requirement   | Accepted values                                           |
| ------------- | --------------------------------------------------------- |
| Accessibility | `internal` **or** `private`                               |
| Modifier      | `static`                                                  |
| Return type   | `void`                                                    |
| Parameter     | `RouteHandlerBuilder` **or** `IEndpointConventionBuilder` |

Use `RouteHandlerBuilder` when you need the route-handler-specific extension methods such as
`Produces<T>()` or `WithOpenApi()`; `IEndpointConventionBuilder` is enough for the generic
conventions. Anything else — `public`, an instance method, a non-`void` return, a different parameter
type, or two `CustomizeEndpoint` overloads on one class — is
[IAPI0004](/docs/Immediate.Apis/diagnostics#iapi0004), a warning, and the method is **silently
ignored** by the generator.

## `TransformResult`

When you want the endpoint to return something other than the handler's response type — typically a
`Results<,>` union so ASP.NET Core can produce different status codes — add a `TransformResult`
method. The generated delegate returns `TransformResult(ret)` instead of `ret`.

```csharp title="GetUser.cs" {5-8}
[Handler]
[MapGet("/users/{id:int}")]
public static partial class GetUser
{
	internal static Results<Ok<User>, NotFound> TransformResult(User? result)
		=> result is null
			? TypedResults.NotFound()
			: TypedResults.Ok(result);

	public sealed record Query
	{
		public required int Id { get; init; }
	}

	private static ValueTask<User?> HandleAsync(
		Query query,
		UsersService usersService,
		CancellationToken token
	)
	{
		return usersService.GetUserAsync(query.Id, token);
	}
}
```

The rules are stricter than for `CustomizeEndpoint`:

| Requirement   | Value                                                              |
| ------------- | ------------------------------------------------------------------ |
| Accessibility | `internal` only — `private` is rejected                            |
| Modifier      | `static`                                                           |
| Return type   | anything except `void`                                             |
| Parameter     | exactly the handler's response type, matched including nullability |

The parameter type must match the `T` in the handler's `ValueTask<T>` _including nullability
annotations_: a handler returning `ValueTask<User?>` needs `TransformResult(User? result)`, not
`TransformResult(User result)`. A mismatch is
[IAPI0005](/docs/Immediate.Apis/diagnostics#iapi0005) and the method is ignored.

### Command handlers with no response

A handler whose `HandleAsync` returns a bare `ValueTask` has no response value, so its
`TransformResult` takes **no parameters at all**:

```csharp title="DeleteUser.cs" {5-6}
[Handler]
[MapDelete("/users/{id:int}")]
public static partial class DeleteUser
{
	internal static NoContent TransformResult()
		=> TypedResults.NoContent();

	public sealed record Command
	{
		public required int Id { get; init; }
	}

	private static async ValueTask HandleAsync(
		Command command,
		UsersService usersService,
		CancellationToken token
	)
	{
		await usersService.DeleteAsync(command.Id, token);
	}
}
```

## Choosing between them

- Need static OpenAPI metadata? Use attributes on `HandleAsync`.
- Need the builder API, a filter, or anything conditional? Use `CustomizeEndpoint`.
- Need to change the HTTP status code based on the response value? Use `TransformResult`.
- Need the same customization on every endpoint in a set? Use a
  [route group](/docs/Immediate.Apis/route-groups), or the `RouteGroupBuilder` returned by
  `MapXxxEndpoints`.
