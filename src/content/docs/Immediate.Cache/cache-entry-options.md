---
title: Configuring cache entries
description: Override GetCacheEntryOptions to control expiration, priority, size and eviction callbacks; the default is a five-minute sliding expiration.
order: 4
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Expiration is controlled by one overridable method on `ApplicationCache<TRequest, TResponse>`:

```csharp
protected virtual MemoryCacheEntryOptions GetCacheEntryOptions();
```

Its default implementation is:

```csharp
protected virtual MemoryCacheEntryOptions GetCacheEntryOptions() =>
	new()
	{
		SlidingExpiration = TimeSpan.FromMinutes(5),
	};
```

<Callout type="note" title="The default is a five-minute sliding expiration">

Unless you override this method, every entry in every generated cache expires five minutes after it
was last touched. There is no configuration file, options class or attribute for this — overriding
`GetCacheEntryOptions` is the only lever.

</Callout>

## Overriding it

```csharp title="GetUserCache.cs"
[CacheFor<GetUser>]
public sealed partial class GetUserCache
{
	protected override string TransformKey(GetUser.Query request) =>
		$"GetUser({request.UserId})";

	protected override MemoryCacheEntryOptions GetCacheEntryOptions() =>
		new()
		{
			AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1),
			Priority = CacheItemPriority.High,
		};
}
```

`MemoryCacheEntryOptions` lives in `Microsoft.Extensions.Caching.Memory`. Everything the memory
cache understands is available: `AbsoluteExpiration`, `AbsoluteExpirationRelativeToNow`,
`SlidingExpiration`, `Priority`, `Size`, `ExpirationTokens` and `PostEvictionCallbacks`.

To cache forever, return an empty `MemoryCacheEntryOptions` — that replaces the default sliding
expiration with no expiration at all:

```csharp
protected override MemoryCacheEntryOptions GetCacheEntryOptions() => new();
```

## When it is called

The method is invoked **once per cache key**, at the moment the entry is first created — which
happens on the first `GetValue`, `SetValue`, `RemoveValue` or `TransformValue` for that request. It
takes no parameters, so you cannot vary the policy per request: one cache class means one entry
policy for all of its keys. Split the handler into separate handlers with separate cache classes if
you need different lifetimes.

Because the method is called only at creation time, options are not re-evaluated later. A sliding
window, on the other hand, _is_ refreshed by every subsequent cache operation, since each one
performs a lookup against `IMemoryCache`.

## What expiring actually does

The value stored under the key is an internal wrapper holding the shared execution slot and the
cached response, not the response itself. When the entry expires or is evicted, that wrapper goes
with it, and the next `GetValue` creates a fresh one and re-executes the handler.

<Callout type="warning">

For the same reason, a `PostEvictionCallback` receives that internal wrapper as its `value`
argument, not your `TResponse`. Do not attempt to cast it. Use eviction callbacks for logging and
metrics, not for reading the evicted response.

</Callout>

<Callout type="warning" title="Size is required when the memory cache has a SizeLimit">

If you configure `AddMemoryCache(o => o.SizeLimit = …)`, every entry must specify a `Size`.
Immediate.Cache's default options do not set one, so entry creation will throw
`InvalidOperationException` until you override `GetCacheEntryOptions` and set it:

```csharp
protected override MemoryCacheEntryOptions GetCacheEntryOptions() =>
	new()
	{
		SlidingExpiration = TimeSpan.FromMinutes(5),
		Size = 1,
	};
```

</Callout>

## Sharing a policy across caches

You cannot introduce a shared base class between your cache and `ApplicationCache<,>`: the
generated `partial` declaration already fixes the base type. Share a policy with a plain helper
instead:

```csharp title="CachePolicies.cs"
internal static class CachePolicies
{
	public static MemoryCacheEntryOptions ShortLived() =>
		new()
		{
			SlidingExpiration = TimeSpan.FromMinutes(1),
			Priority = CacheItemPriority.Low,
		};
}
```

```csharp title="GetUserCache.cs"
protected override MemoryCacheEntryOptions GetCacheEntryOptions() =>
	CachePolicies.ShortLived();
```

Next: [testing caches](/docs/Immediate.Cache/testing-caches).
