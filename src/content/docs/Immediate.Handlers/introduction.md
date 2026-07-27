---
title: Introduction
description: Immediate.Handlers is a compile-time mediator for .NET, built entirely on source generation.
order: 1
---

<script lang="ts">
	import { Callout, CardGrid, LinkCard, PackageBadges } from '$lib/components/docs';
</script>

<PackageBadges name="Immediate.Handlers" />

Immediate.Handlers is an implementation of the mediator pattern in .NET using source generation. Every
pipeline behavior is resolved and the call tree is built at compile time, so the handler you consume is
an ordinary class with an ordinary constructor — there is no runtime assembly scanning, no reflection,
and no service-locator lookup on the request path. Dependencies still come from
`Microsoft.Extensions.DependencyInjection` at runtime, but _which_ dependencies are needed was decided
by the compiler.

## Installation

```bash
dotnet add package Immediate.Handlers
```

<Callout type="note" title="Prerequisites">

Immediate.Handlers is the core of the platform and has no companion package requirements of its own; it
depends only on `Microsoft.Extensions.DependencyInjection.Abstractions`. Immediate.Validations,
Immediate.Apis and Immediate.Cache all build on top of it. Supported target frameworks are `net8.0`
through `net11.0`. See [Package compatibility](/docs/concepts/package-compatibility).

</Callout>

## A minimal example

A handler is a class marked with `[Handler]` that contains exactly one `private` `Handle` or
`HandleAsync` method.

```csharp title="GetUsersQuery.cs"
using Immediate.Handlers.Shared;

namespace Application;

[Handler]
public sealed partial class GetUsersQuery(UsersService usersService)
{
	public sealed record Query;

	public sealed record Response(int Id, string Name);

	private async ValueTask<IEnumerable<Response>> HandleAsync(
		Query query,
		CancellationToken token
	)
	{
		var users = await usersService.GetUsers(token);
		return users.Select(u => new Response(u.Id, u.Name));
	}
}
```

Register the generated handlers and behaviors at startup:

```csharp title="Program.cs"
builder.Services.AddApplicationBehaviors();
builder.Services.AddApplicationHandlers();
```

Then inject the generated `GetUsersQuery.Handler` wherever you need it:

```csharp title="UsersEndpoint.cs"
public sealed class UsersEndpoint(GetUsersQuery.Handler handler)
{
	public async ValueTask<IEnumerable<GetUsersQuery.Response>> GetUsers(CancellationToken token) =>
		await handler.HandleAsync(new GetUsersQuery.Query(), token);
}
```

The `Application` in `AddApplicationHandlers` comes from the assembly name. See
[The assembly identifier](/docs/concepts/assembly-identifier) for how that name is derived and how to
override it.

## Where to next

<CardGrid cols={2}>
	<LinkCard
		title="Creating handlers"
		description="The rules the generator enforces on a handler class and its handle method."
		href="/docs/Immediate.Handlers/creating-handlers"
	/>
	<LinkCard
		title="Handler dependencies"
		description="Static versus sealed-instance handlers, and how services reach your method."
		href="/docs/Immediate.Handlers/handler-dependencies"
	/>
	<LinkCard
		title="Creating behaviors"
		description="Cross-cutting pipeline steps, ordering, and constraint-based matching."
		href="/docs/Immediate.Handlers/creating-behaviors"
	/>
	<LinkCard
		title="Streaming handlers"
		description="Handlers that return IAsyncEnumerable, and streaming behaviors."
		href="/docs/Immediate.Handlers/streaming-handlers"
	/>
	<LinkCard
		title="Registering with IServiceCollection"
		description="What gets registered, with which lifetime, and how to override it."
		href="/docs/Immediate.Handlers/registration"
	/>
	<LinkCard
		title="How it works"
		description="The exact code the generator emits, for when DI resolution goes wrong."
		href="/docs/Immediate.Handlers/how-it-works"
	/>
</CardGrid>
