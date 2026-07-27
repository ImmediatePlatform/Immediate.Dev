---
title: How it works
description: The files and members the generator emits per endpoint, per route group and per assembly.
order: 10
group: Reference
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Apis hooks the same `[Handler]` attribute that Immediate.Handlers does, then looks for a
`Map` attribute on the class. Everything below is written at compile time; nothing is discovered at
startup. For the general mechanics and how to inspect generated files, see
[How source generation works](/docs/concepts/source-generation).

<Callout type="note">

The generator fully qualifies type names with <code>global::</code>. Those prefixes are omitted
from the listings below for readability.

</Callout>

## The files

| File                           | Contents                                                  |
| ------------------------------ | --------------------------------------------------------- |
| `IA.<Namespace>.<Class>.g.cs`  | One per endpoint                                          |
| `IA.<Namespace>..<Group>.g.cs` | One per **top-level** route group, including its children |
| `IA.MapEndpoints.g.cs`         | One per assembly                                          |

<Callout type="note">

The route-group file name is built from the namespace, the outer class names and the group class
name. A top-level group has no outer classes, so the name contains a doubled dot —
`IA.Dummy..Root.g.cs`. That is expected, not a bug in your project.

</Callout>

## Per endpoint

For a handler like this:

```csharp title="GetUsers.cs"
[Handler]
[MapGet("/users")]
public static partial class GetUsers
{
	public sealed record Query;

	private static ValueTask<IReadOnlyList<User>> HandleAsync(
		Query _,
		UsersService usersService,
		CancellationToken token
	) => usersService.GetUsersAsync(token);
}
```

the generator adds three members to the partial class (simplified):

```csharp title="IA.Users.GetUsers.g.cs"
/// <remarks><see cref="Users.GetUsers.Query" /> registered using
/// <c>[<see cref="Microsoft.AspNetCore.Http.AsParametersAttribute" />]</c></remarks>
partial class GetUsers
{
	[GeneratedCode("Immediate.Apis", "…")]
	internal static void MapEndpoint(IEndpointRouteBuilder app)
	{
		var endpoint = EndpointRouteBuilderExtensions.MapGet(
			app,
			"/users",
			async (
				[AsParametersAttribute] Users.GetUsers.Query parameters,
				[FromServices] Users.GetUsers.Handler handler,
				CancellationToken token
			) =>
			{
				var ret = await handler.HandleAsync(parameters, token);
				return ret;
			}
		);
	}

	[GeneratedCode("Immediate.Apis", "…")]
	public static IReadOnlyList<string> Routes { get; } = ["/users"];

	[GeneratedCode("Immediate.Apis", "…")]
	public static string Route { get; } = "/users";
}
```

Points worth knowing:

- The delegate resolves your handler with `[FromServices] …​.Handler`, which is the class
  Immediate.Handlers generates. That is why `AddXxxHandlers()` is still required.
- The `<remarks>` comment records which binding attribute was inferred — the quickest way to check
  [binding](/docs/Immediate.Apis/binding-request-data) without reading the whole file.
- With several routes, the body repeats the `MapGet` call once per route, reassigning `endpoint` each
  time. Authorization and `CustomizeEndpoint` are applied inside that loop, so each route gets them.
- The order inside `MapEndpoint` is fixed: map the route, then `AllowAnonymous()` **or**
  `RequireAuthorization(...)`, then `CustomizeEndpoint(endpoint)`.
- `MapEndpoint` is `internal`, so it is callable from your own composition code within the same
  assembly if you ever need to map one endpoint by hand.

### `Route` and `Routes`

`Routes` is always emitted. `Route` is emitted **only when the attribute declares exactly one
route** — with two or more, referencing `Route` is a compile error rather than a silent pick.

These properties are the reason to stop hardcoding URLs in tests and link generation:

```csharp title="GetUsersTests.cs"
var response = await client.GetAsync(GetUsers.Route);
```

```csharp title="LinkBuilder.cs"
foreach (var route in GetUsers.Routes)
{
	// ...
}
```

They are `public` and carry no `[EditorBrowsable]` restriction, so they show up in IntelliSense on the
handler class.

## Per assembly

Every assembly with at least one endpoint gets `IA.MapEndpoints.g.cs`:

```csharp title="IA.MapEndpoints.g.cs"
public static partial class ApisServiceCollectionExtensions
{
	public static RouteGroupBuilder MapUsersApiEndpoints(
		this IEndpointRouteBuilder app,
		[StringSyntax("Route")] string prefix = "",
		params ReadOnlySpan<string> tags
	)
	{
		var group = EndpointRouteBuilderExtensions.MapGroup(app, prefix);

		Users.GetUsers.MapEndpoint(group);

		if (tags is [] || Intersects(tags, ["Admin"]))
		{
			Users.Admin.MapGroup(group, tags);
		}

		return group;
	}

	private static bool Intersects(ReadOnlySpan<string> first, ReadOnlySpan<string> second) { /* ... */ }
}
```

- The class is always called `ApisServiceCollectionExtensions` and is emitted in the **global
  namespace**, so no `using` is needed in `Program.cs`. The _method_ name is what carries the
  [assembly identifier](/docs/concepts/assembly-identifier).
- Everything is wrapped in a `MapGroup(prefix)`, and that `RouteGroupBuilder` is returned, so
  conventions chained onto the call apply to every endpoint in the assembly.
- Untagged endpoints are emitted without a guard; tagged ones sit inside an `Intersects` check. See
  [Tagged registration](/docs/Immediate.Apis/tagged-registration).
- Only endpoints **without** a `[MapGroup<T>]` and route groups that are **not nested** in another
  group appear here. Everything else is reached through a group.
- On C# 12 and below `tags` is generated as `params string[]`.

## Per route group

One file is emitted per top-level route group, containing the whole nested hierarchy as nested
partial classes. Each group class gets:

```csharp title="IA.Users..Admin.g.cs"
partial class Admin
{
	[GeneratedCode("Immediate.Apis", "…")]
	internal static void MapGroup(IEndpointRouteBuilder app, ReadOnlySpan<string> tags)
	{
		var group = EndpointRouteBuilderExtensions.MapGroup(app, "api/admin");

		CustomizeGroup(group);

		Users.DeleteUser.MapEndpoint(group);

		Users.Admin.Reports.MapGroup(group, tags);
	}

	public const string DeleteUser = "api/admin/users/{id:int}";

	partial class Reports { /* ... */ }
}
```

- `CustomizeGroup(group)` is called first, before any endpoint or child group is mapped, and only
  when a valid `CustomizeGroup` method exists.
- `tags` is threaded down the hierarchy so filtering applies at every level.
- One `public const string` is emitted per endpoint in the group **that has exactly one route**,
  named after the endpoint class. Its value is the group prefixes and the endpoint route joined with
  `/`, with no normalization.
- The top-level group class also receives the same `private static bool Intersects(...)` helper used
  by the assembly registration.
