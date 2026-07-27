---
title: Testing caches
description: Compose a real service collection with AddMemoryCache, the generated caches and the generated handlers, then resolve and exercise the cache class.
order: 5
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Caches are not worth mocking — the interesting behavior (coalescing, invalidation, expiry) lives in
the base class. Build a real `ServiceCollection`, which is exactly what the package's own functional
tests do.

## The composition recipe

```csharp title="GetValueCacheTests.cs"
public sealed class GetValueCacheTests
{
	private readonly ServiceProvider _serviceProvider;

	public GetValueCacheTests()
	{
		var services = new ServiceCollection();
		_ = services.AddMemoryCache();
		_ = services.AddApplicationCaches();
		_ = services.AddApplicationHandlers();

		_serviceProvider = services.BuildServiceProvider();
	}

	[Fact]
	public async Task GetValueCachesValue()
	{
		var cache = _serviceProvider.GetRequiredService<GetValueCache>();

		var request = new GetValue.Query(Value: 1);
		var response = await cache.GetValue(request, TestContext.Current.CancellationToken);

		Assert.Equal(1, response.Value);

		var memoryCache = _serviceProvider.GetRequiredService<IMemoryCache>();
		Assert.True(memoryCache.TryGetValue($"GetValue(query: {request.Value})", out _));
	}
}
```

Three registrations are required and their order does not matter:

| Call               | Why                                                                               |
| ------------------ | --------------------------------------------------------------------------------- |
| `AddMemoryCache()` | Supplies the `IMemoryCache` every cache class takes in its constructor            |
| `AddXxxCaches()`   | Registers the cache classes and the open generic `Owned<>`                        |
| `AddXxxHandlers()` | Registers `IHandler<TRequest, TResponse>`, which the cache resolves per execution |

<Callout type="note">

`AddXxxCaches()` is generated into the assembly that **declares the cache classes**. From a test
project named `Application.Tests` that tests caches living in `Application`, you call
`services.AddApplicationCaches()` — not `AddApplicationTestsCaches()`. Add
`Microsoft.Extensions.Caching.Memory` to the test project so `AddMemoryCache()` is available.

</Callout>

<Callout type="warning">

Cache classes are registered as **Singletons**, so cached values live as long as the
`ServiceProvider`. Build a fresh provider per test class (or per test) rather than sharing one, or
tests will see each other's cached responses.

</Callout>

## Asserting on the memory cache

`IMemoryCache.TryGetValue` tells you whether an entry exists for a key, which is enough to assert
that `TransformKey` produced what you expected. Do not assert on the entry's value: it is an
internal wrapper type, not your `TResponse`. Assert on what `GetValue` returns instead.

## Proving that the handler ran (or did not)

Give the response a flag, or count executions in a test double, and use `SetValue` to prime the
cache:

```csharp
[Fact]
public async Task SetValueBypassesHandler()
{
	var cache = _serviceProvider.GetRequiredService<GetValueCache>();

	var request = new GetValue.Query(Value: 2);
	cache.SetValue(request, new GetValue.Response(4, ExecutedHandler: false));

	var response = await cache.GetValue(request, TestContext.Current.CancellationToken);

	Assert.Equal(4, response.Value);
	Assert.False(response.ExecutedHandler);
}
```

## Substituting the handler

The cache resolves `IHandler<TRequest, TResponse>` from a fresh scope on every execution, so you can
skip `AddXxxHandlers()` and register a stub against that interface:

```csharp
services.AddScoped<IHandler<GetValue.Query, GetValue.Response>, FakeGetValueHandler>();
```

This gives you a handler you fully control while keeping the real caching behavior under test.

## Testing concurrency

To exercise coalescing, cancellation and `TransformValue` retries, make the handler block on a
`TaskCompletionSource` that the test releases. Start two `GetValue` calls, assert neither task has
completed, release the handler, and assert both callers received the same response instance — that
is how the package verifies that one execution serves both callers. The same technique proves the
[`TransformValue` retry](/docs/Immediate.Cache/reading-and-writing): hold the transformer open, call
`SetValue` underneath it, release it, and observe the transformer run a second time.

Next: the [API reference](/docs/Immediate.Cache/api-reference).
