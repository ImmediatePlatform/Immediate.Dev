---
title: Route groups
description: Share a route prefix and endpoint conventions across a set of endpoints with [RouteGroup] and [MapGroup].
order: 6
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

A route group is a class marked with `[RouteGroup]`. Endpoints opt into it with `[MapGroup<T>]`, and
the generator maps them inside an ASP.NET Core `RouteGroupBuilder` — so they share a prefix and any
conventions the group applies.

## Defining a group

```csharp title="Users.cs"
[RouteGroup("api/users")]
public sealed partial class Users
{
	private static void CustomizeGroup(RouteGroupBuilder group)
		=> group
			.RequireAuthorization("UserManagement")
			.WithTags("Users");
}
```

The class must be `partial` — the generator adds a `MapGroup` method to it. `CustomizeGroup` is
optional.

## Attaching endpoints

```csharp title="GetUsers.cs" {3}
[Handler]
[MapGet("")]
[MapGroup<Users>]
public static partial class GetUsers
{
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

The type argument to `[MapGroup<T>]` must carry `[RouteGroup]`. If it does not,
[IAPI0013](/docs/Immediate.Apis/diagnostics#iapi0013) is reported as an **error** and the endpoint is
not generated at all.

<Callout type="warning" title="Grouped endpoints leave the top-level registration">

An endpoint with `[MapGroup<T>]` is **no longer registered by `MapXxxEndpoints()` directly**. It is
reached only through its group, which `MapXxxEndpoints()` maps for you as long as the group is a
top-level one. This is by design, but it means a typo in the group hierarchy makes routes silently
disappear rather than fail.

</Callout>

## Nesting groups

Groups nest through **nested C# classes**, not through an attribute parameter. Declare an inner
`[RouteGroup]` class inside an outer one and the routes compose:

```csharp title="Api.cs" {1,4,10}
[RouteGroup("api")]
public sealed partial class Api
{
	[RouteGroup("v1")]
	public sealed partial class V1
	{
		private static void CustomizeGroup(RouteGroupBuilder group)
			=> group.WithTags("v1");

		[RouteGroup("users")]
		public sealed partial class Users;
	}
}
```

An endpoint names only the **innermost** group it belongs to:

```csharp title="GetUsers.cs" {3}
[Handler]
[MapGet("")]
[MapGroup<Api.V1.Users>]
public static partial class GetUsers
{
	// ...
}
```

`MapXxxEndpoints()` maps `Api`; `Api` maps `Api.V1`; `Api.V1` maps `Api.V1.Users`; and `Api.V1.Users`
maps `GetUsers`. The final route is `api/v1/users`.

<Callout type="danger" title="A [RouteGroup] nested in a non-group class is silently ignored">

The generator only accepts a `[RouteGroup]` class whose containing type is _also_ a `[RouteGroup]`
class (or which has no containing type at all). A `[RouteGroup]` class nested inside an ordinary
class produces no group, no diagnostic, and any endpoint pointing at it is never mapped —
`[MapGroup<T>]` is happy, because its target does carry `[RouteGroup]`. If a grouped endpoint returns
404, check that every class in the chain is a route group or the top level.

</Callout>

## Customizing a group

`CustomizeGroup` is called once, immediately after the group's `MapGroup` call and _before_ any
endpoints or child groups are mapped into it. Its shape is stricter than
[`CustomizeEndpoint`](/docs/Immediate.Apis/customizing-endpoints#customizeendpoint):

| Requirement   | Value               |
| ------------- | ------------------- |
| Accessibility | `private` **only**  |
| Modifier      | `static`            |
| Return type   | `void`              |
| Parameter     | `RouteGroupBuilder` |

`internal` is accepted for `CustomizeEndpoint` but **not** for `CustomizeGroup`. Anything else is
[IAPI0011](/docs/Immediate.Apis/diagnostics#iapi0011), a warning, and the method is silently ignored.

[IAPI0012](/docs/Immediate.Apis/diagnostics#iapi0012) is the hidden diagnostic that offers the
**Add `CustomizeGroup` method** refactoring on a group class that has none.

## Generated route constants

Each group class gets a `public const string` for every endpoint mapped into it that has exactly one
route, named after the endpoint class:

```csharp
// generated on Api.V1.Users
public const string GetUsers = "api/v1/users/";
```

That makes it safe to reference routes from integration tests and link generation:

```csharp title="GetUsersTests.cs"
var response = await client.GetAsync(Api.V1.Users.GetUsers);
```

<Callout type="note" title="Constants are a plain string join">

The constant is built by joining the group routes and the endpoint route with `/`, with no
normalization. `[RouteGroup("/api/users")]` plus `[MapGet("/")]` yields `"/api/users//"` — routing
still works, because ASP.NET Core normalizes the actual template, but the constant does not match the
request path. Write group routes and endpoint routes without leading slashes (`"api/users"`, `"list"`)
if you plan to use the constants.

</Callout>

## Registering groups

You do not map groups yourself. `MapXxxEndpoints()` maps every **top-level** group (one that is not
nested inside another group), passing its `tags` down the tree so that
[tag filtering](/docs/Immediate.Apis/tagged-registration) applies at every level:

```csharp title="Program.cs"
app.MapUsersApiEndpoints();
```

To apply conventions across everything, use the returned `RouteGroupBuilder`, or use the `prefix`
parameter to mount the whole tree somewhere else:

```csharp title="Program.cs"
app.MapUsersApiEndpoints("/external")
	.RequireAuthorization();
```
