---
title: Creating a cache
description: Declare a cache class, implement TransformKey, and register the generated caches with the service collection.
order: 2
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

A cache is a `partial` class marked with `[CacheFor<THandler>]` that supplies one method:
`TransformKey`, which turns a request into the string used as the cache key. The source generator
adds the base class and the constructor.

```csharp title="GetValue.cs"
[Handler]
public sealed partial class GetValue
{
	public sealed record Query(int Value);
	public sealed record Response(int Value);

	private ValueTask<Response> HandleAsync(
		Query query,
		CancellationToken _
	) => ValueTask.FromResult(new Response(query.Value));
}
```

```csharp title="GetValueCache.cs"
[CacheFor<GetValue>]
public sealed partial class GetValueCache
{
	protected override string TransformKey(GetValue.Query request) =>
		$"GetValue(query: {request.Value})";
}
```

`GetValueCache` now derives from `ApplicationCache<GetValue.Query, GetValue.Response>` — the
generator infers both type arguments from the handler's `HandleAsync` signature, so you never write
them yourself. That is also why `TransformKey` is an `override` in a class with no visible base
type.

<Callout type="danger" title="The target handler must not be static">

`[CacheFor<T>]` silently generates **nothing** when `T` is a `static` class. Immediate.Handlers
happily accepts `public static partial class GetValue` with a `private static HandleAsync`, but
Immediate.Cache's generator requires the handler type argument to be a non-static type; when it is
static the generator skips the class entirely, no base type is emitted, and your `TransformKey`
fails to compile with:

```text
error CS0115: 'GetValueCache.TransformKey(GetValue.Query)': no suitable method found to override
```

**No `IC` diagnostic reports this** — the analyzer checks that the target carries `[Handler]` and
returns a value, but not that it is an instance class. If you see CS0115 on `TransformKey`, change
the handler from `public static partial class` to `public sealed partial class` (and drop `static`
from its `HandleAsync`). See [Diagnostics](/docs/Immediate.Cache/diagnostics) for
the other compile failures with no matching diagnostic.

</Callout>

## Requirements

| Requirement                                       | Enforced by                                   |
| ------------------------------------------------- | --------------------------------------------- |
| The cache class is declared `partial`             | Compiler (`CS0260`)                           |
| The cache class is not nested in another type     | [`IC0001`](/docs/Immediate.Cache/diagnostics) |
| The target type carries `[Handler]`               | [`IC0002`](/docs/Immediate.Cache/diagnostics) |
| The target's handle method returns `ValueTask<T>` | [`IC0003`](/docs/Immediate.Cache/diagnostics) |

Bare `ValueTask` command handlers cannot be cached: there is no response to store, and `IC0003`
reports it.

## Registering the generated caches

In your `Program.cs`, add a call to `services.AddXxxCaches()`, where `Xxx` is the application
identifier. By default this is the assembly name with `.` and spaces removed:

- For a project named `Web`, it will be `services.AddWebCaches()`
- For a project named `Application.Web`, it will be `services.AddApplicationWebCaches()`

The name can be overridden with
`[assembly: ImmediateAssemblyIdentifier("SomeIdentifier")]` — see
[The assembly identifier](/docs/concepts/assembly-identifier).

```csharp title="Program.cs"
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMemoryCache();
builder.Services.AddWebBehaviors();
builder.Services.AddWebHandlers();
builder.Services.AddWebCaches();
```

<Callout type="warning">

`AddXxxCaches()` registers the caches but **not** an `IMemoryCache`. Without a call to
`AddMemoryCache()`, resolving a cache class throws at the first request for `IMemoryCache`. The
handlers themselves still need `AddXxxHandlers()`: the cache resolves its handler from the
container each time it executes.

</Callout>

## Consuming the cache

Each cache class is registered under its own concrete type, not under `ApplicationCache<,>` or any
interface. Inject the class directly:

```csharp title="UsersController.cs"
public sealed class UsersController(GetValueCache cache)
{
	public async Task<GetValue.Response> Get(int value, CancellationToken token) =>
		await cache.GetValue(new GetValue.Query(value), token);
}
```

Cache classes are registered as **Singletons**, so never inject a scoped service such as a
`DbContext` into your cache class — see [How it works](/docs/Immediate.Cache/how-it-works). Scoped
dependencies belong on the handler.

Next: [reading and writing cached data](/docs/Immediate.Cache/reading-and-writing).
