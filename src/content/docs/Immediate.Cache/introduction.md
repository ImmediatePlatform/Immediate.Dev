---
title: Introduction
description: Immediate.Cache generates in-memory caches for Immediate.Handlers handlers, with request coalescing, invalidation and read-modify-write built in.
order: 1
---

<script lang="ts">
	import { Callout, CardGrid, LinkCard, PackageBadges } from '$lib/components/docs';
</script>

<PackageBadges name="Immediate.Cache" />

Immediate.Cache caches the responses of [Immediate.Handlers](/docs/Immediate.Handlers/introduction)
handlers. You write a small class, mark it with `[CacheFor<THandler>]`, and describe how a request
becomes a cache key; a source generator makes that class derive from
`ApplicationCache<TRequest, TResponse>` and wires up its constructor and DI registration at compile
time.

Beyond a plain `IMemoryCache` lookup, the base class gives you request coalescing (simultaneous
callers for the same key share one handler execution), imperative `SetValue`/`RemoveValue`
invalidation, and an optimistic read-modify-write helper.

<Callout type="warning" title="IMemoryCache is the only backing store">

Immediate.Cache stores everything in the `IMemoryCache` registered in your container. There is no
`IDistributedCache` and no `HybridCache` support, and no extension point to substitute one — the
store is a constructor parameter of `ApplicationCache<,>` typed as `IMemoryCache`. Every process
in a multi-instance deployment therefore keeps its own copy, and `RemoveValue` only invalidates the
instance it runs on.

</Callout>

## Installation

```bash
dotnet add package Immediate.Cache
```

The package ships the runtime types, the source generator and the analyzers together. It targets
`net8.0`, `net9.0` and `net10.0`.

<Callout type="note" title="Prerequisites">

- **Immediate.Handlers** is required. Immediate.Cache only wraps `[Handler]` classes, and its
  runtime types reference `IHandler<TRequest, TResponse>`. It is pulled in transitively, but you
  need it in the project that declares your handlers regardless.
- **`Microsoft.Extensions.Caching.Memory`** is required to call `AddMemoryCache()`. Immediate.Cache
  only references `Microsoft.Extensions.Caching.Abstractions`, so a non-ASP.NET Core project must
  add the memory-cache package itself. ASP.NET Core projects already have it via the shared
  framework.

</Callout>

## A quick look

```csharp title="GetUser.cs"
[Handler]
public sealed partial class GetUser
{
	public sealed record Query(int UserId);
	public sealed record Response(int UserId, string Name);

	private async ValueTask<Response> HandleAsync(
		Query query,
		UserRepository repository,
		CancellationToken token
	) => await repository.GetUser(query.UserId, token);
}

[CacheFor<GetUser>]
public sealed partial class GetUserCache
{
	protected override string TransformKey(GetUser.Query request) =>
		$"GetUser({request.UserId})";
}
```

Register the generated cache alongside your handlers, then inject `GetUserCache` and call it:

```csharp title="Program.cs"
builder.Services.AddMemoryCache();
builder.Services.AddWebHandlers();
builder.Services.AddWebCaches();
```

```csharp
var response = await cache.GetValue(new GetUser.Query(42), token);
```

## Where to go next

<CardGrid cols={2}>
	<LinkCard
		title="Creating a cache"
		description="Declare a cache class, satisfy the requirements on the target handler, and register it."
		href="/docs/Immediate.Cache/creating-a-cache"
	/>
	<LinkCard
		title="Reading and writing cached data"
		description="GetValue, SetValue, RemoveValue and TransformValue, and the concurrency rules behind them."
		href="/docs/Immediate.Cache/reading-and-writing"
	/>
	<LinkCard
		title="Configuring cache entries"
		description="Override GetCacheEntryOptions to change the five-minute sliding expiration default."
		href="/docs/Immediate.Cache/cache-entry-options"
	/>
	<LinkCard
		title="Testing caches"
		description="The service-collection recipe used by the package's own functional tests."
		href="/docs/Immediate.Cache/testing-caches"
	/>
	<LinkCard
		title="API reference"
		description="Every public and protected member of ApplicationCache, Owned and OwnedScope."
		href="/docs/Immediate.Cache/api-reference"
	/>
	<LinkCard
		title="How it works"
		description="Why caches are Singletons, and how Owned resolves the scoped-handler tension."
		href="/docs/Immediate.Cache/how-it-works"
	/>
	<LinkCard
		title="Diagnostics"
		description="IC0001–IC0003, the CA2000 suppressor, and troubleshooting compile failures."
		href="/docs/Immediate.Cache/diagnostics"
	/>
</CardGrid>
