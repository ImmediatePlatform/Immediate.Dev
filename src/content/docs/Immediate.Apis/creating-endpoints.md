---
title: Creating endpoints
description: Turn a handler into a minimal API endpoint with a Map attribute, and register the lot with MapXxxEndpoints.
order: 2
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Any [Immediate.Handlers](/docs/Immediate.Handlers/introduction) handler becomes an endpoint by
adding a `Map` attribute next to `[Handler]`:

```csharp title="GetUsers.cs" {2}
[Handler]
[MapGet("/users")]
public static partial class GetUsers
{
	public sealed record Query;

	private static ValueTask<IEnumerable<User>> HandleAsync(
		Query _,
		UsersService usersService,
		CancellationToken token
	)
	{
		return usersService.GetUsersAsync(token);
	}
}
```

The class must also carry `[Handler]`. Without it the generator has no `Handler` type to resolve from
DI, and [IAPI0001](/docs/Immediate.Apis/diagnostics#iapi0001) is reported as an
error, with a code fix that adds the attribute.

## The verb attributes

Five attributes cover the common HTTP verbs:

| Attribute     | Verb     |
| ------------- | -------- |
| `[MapGet]`    | `GET`    |
| `[MapPost]`   | `POST`   |
| `[MapPut]`    | `PUT`    |
| `[MapPatch]`  | `PATCH`  |
| `[MapDelete]` | `DELETE` |

For anything else — `HEAD`, `OPTIONS`, a WebDAV verb, a custom one — use `[MapMethod]`, which takes
the verb first and the routes after:

```csharp title="HeadHealth.cs" {2}
[Handler]
[MapMethod("HEAD", "/health")]
public static partial class HeadHealth
{
	public sealed record Query;

	private static ValueTask<bool> HandleAsync(Query _, CancellationToken token) =>
		ValueTask.FromResult(true);
}
```

`[MapMethod]` generates a call to `MapMethods(app, route, ["HEAD"], …)` rather than one of the
verb-specific helpers.

<Callout type="warning" title="[MapMethod] never infers [FromBody]">

Request binding is inferred from the _attribute type_, not from the verb string.
`[MapMethod("POST", "/users")]` binds its request as `[AsParameters]`, not `[FromBody]` — see
[Binding request data](/docs/Immediate.Apis/binding-request-data). Use `[MapPost]` when you want body
binding, or put an explicit `[FromBody]` on the request parameter.

</Callout>

## Multiple routes

Every `Map` attribute takes `params string[] routes`, so one handler can answer on several paths. The
generator emits one `MapGet`/`MapPost`/… call per route, all pointing at the same handler:

```csharp title="GetUsers.cs" {2}
[Handler]
[MapGet("/api/users", "/v1/users")]
public static partial class GetUsers
{
	// ...
}
```

`[MapMethod]` works the same way after the verb: `[MapMethod("HEAD", "/api/health", "/health")]`.

<Callout type="note">

With exactly one route the generator also emits a `Route` property on the class; with more than one,
only `Routes` is emitted. See [How it works](/docs/Immediate.Apis/how-it-works#route-and-routes).

</Callout>

## Route parameters and constraints

Routes are plain ASP.NET Core route templates, so parameters and constraints such as `{id:int}` work
as usual. Route values are bound onto properties of your request type:

```csharp title="GetUser.cs" {2,7}
[Handler]
[MapGet("/users/{id:int}")]
public static partial class GetUser
{
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

A `GET` request binds as `[AsParameters]`, so `Id` is populated from the route value `id`. For verbs
that bind the body, or for mixed route-plus-body requests, read
[Binding request data](/docs/Immediate.Apis/binding-request-data).

The route strings are marked with `[StringSyntax("Route")]`, so the IDE offers route-template
completion and validation inside the attribute.

## Registering the endpoints

In `Program.cs`, call `app.MapXxxEndpoints()`, where `Xxx` is the
[assembly identifier](/docs/concepts/assembly-identifier) — by default the assembly name with `.`,
`-` and spaces removed:

```csharp title="Program.cs"
var app = builder.Build();

app.MapUsersApiEndpoints();

app.Run();
```

The generated method has this signature:

```csharp
public static RouteGroupBuilder MapUsersApiEndpoints(
	this IEndpointRouteBuilder app,
	[StringSyntax("Route")] string prefix = "",
	params ReadOnlySpan<string> tags
);
```

- **`prefix`** wraps every registered endpoint in a `MapGroup(prefix)`. Pass `"/api"` to mount the
  whole assembly's endpoints under `/api`.
- **`tags`** filters which endpoints are registered — see
  [Tagged registration](/docs/Immediate.Apis/tagged-registration).
- The return value is the `RouteGroupBuilder` for that prefix group, so you can apply conventions
  across everything at once:

```csharp title="Program.cs"
app.MapUsersApiEndpoints("/api")
	.RequireAuthorization()
	.WithTags("Users");
```

<Callout type="note">

On C# 12 and below the `tags` parameter is generated as `params string[]` instead of
`params ReadOnlySpan<string>`. It is called the same way.

</Callout>

## One map attribute per class

The generator reads the _first_ `Map` attribute it finds on the class. Applying two different verb
attributes to the same handler does not produce two endpoints — use one attribute per handler class,
and write a second handler for a second verb.

Two handlers that resolve to the same verb _and_ route within the same route group are reported by
[IAPI0009](/docs/Immediate.Apis/diagnostics#iapi0009), a
warning raised at the end of the compilation and pointing at every conflicting attribute.
