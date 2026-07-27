---
title: API reference
description: Every public and protected member of ApplicationCache, CacheForAttribute, Owned and OwnedScope.
order: 6
group: Reference
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Everything below lives in the `Immediate.Cache.Shared` namespace, shipped in
`Immediate.Cache.Shared.dll` inside the `Immediate.Cache` package.

| Type                                    | Kind                              | Purpose                                            |
| --------------------------------------- | --------------------------------- | -------------------------------------------------- |
| `CacheForAttribute<THandler>`           | `sealed class : Attribute`        | Marks a class as the cache for a handler           |
| `ApplicationCache<TRequest, TResponse>` | `abstract class`                  | The generated base class; holds all cache behavior |
| `Owned<T>`                              | `sealed class`                    | Factory that mints a DI scope rooted on a service  |
| `OwnedScope<T>`                         | `sealed class : IAsyncDisposable` | The scope plus the service resolved from it        |

## `CacheForAttribute<THandler>`

```csharp
[AttributeUsage(AttributeTargets.Class)]
public sealed class CacheForAttribute<THandler> : Attribute
	where THandler : class;
```

Applied to a non-nested, non-static `partial` class. `THandler` is the Immediate.Handlers handler
class — not its request or response type. The attribute has no constructor arguments and no
properties; the request and response types are inferred from the handler's handle method.

```csharp
[CacheFor<GetValue>]
public sealed partial class GetValueCache { … }
```

## `ApplicationCache<TRequest, TResponse>`

```csharp
public abstract class ApplicationCache<TRequest, TResponse>(
	IMemoryCache memoryCache,
	Owned<IHandler<TRequest, TResponse>> handler
)
	where TRequest : class?
	where TResponse : class?
```

You never write this declaration or call this constructor — the generator emits a `partial class`
declaration for your cache that derives from it and forwards both arguments. Both type parameters
are constrained to `class?`, so nullable request and response types are fully supported; declare
your `TransformKey` override with the same nullability as the handler's request type.

<Callout type="note">

The two constructor parameters are the whole dependency surface. There is no hook to swap the
backing store, and no `IDistributedCache` or `HybridCache` variant.

</Callout>

### `TransformKey`

```csharp
protected abstract string TransformKey(TRequest request);
```

The one member you must implement. Converts a request into the `IMemoryCache` key. Two requests
that map to the same string share a cache entry and a handler execution, so include every field
that affects the response.

```csharp
protected override string TransformKey(GetValue.Query request) =>
	$"GetValue(query: {request.Value})";
```

Keys are shared across the whole `IMemoryCache` instance, so prefix them with something specific to
the handler to avoid colliding with other caches or with unrelated code using the same
`IMemoryCache`. If a key is already occupied by a value Immediate.Cache did not write,
`InvalidOperationException` is thrown with the message
`An unknown type has been stored as the cache value for key ...`.

### `GetCacheEntryOptions`

```csharp
protected virtual MemoryCacheEntryOptions GetCacheEntryOptions();
```

Returns the options applied when an entry is created. The default sets a five-minute
`SlidingExpiration`. Takes no parameters, so the policy is per cache class, not per request. See
[Configuring cache entries](/docs/Immediate.Cache/cache-entry-options).

### `GetValue`

```csharp
public ValueTask<TResponse> GetValue(
	TRequest request,
	CancellationToken cancellationToken = default
);
```

Returns the cached response, or executes the handler inside a temporary DI scope and caches the
result. Concurrent calls for one key share a single execution. The token cancels only the caller's
await; the shared execution continues.

### `SetValue`

```csharp
public void SetValue(TRequest request, TResponse value);
```

Stores `value` without executing the handler, creating the entry if needed. Cancels an in-flight
execution for that key and completes its waiters with `value`. Returns `void` — do not `await` it.

### `RemoveValue`

```csharp
public void RemoveValue(TRequest request);
```

Discards the cached response so the next `GetValue` re-executes. Cancels an in-flight execution and
immediately restarts it; waiters receive the restarted execution's result. Does not evict the
`IMemoryCache` entry itself. Returns `void` — do not `await` it.

### `TransformValue`

```csharp
protected ValueTask<TResponse> TransformValue(
	TRequest request,
	Func<TResponse, CancellationToken, ValueTask<TResponse>> transformer,
	CancellationToken token = default
);
```

Optimistic read-modify-write. Reads the current value (triggering a handler execution if none is
cached), applies `transformer`, and stores the result only if the cached value has not changed
meanwhile; otherwise it retries from the top. **`transformer` may run more than once and must be
idempotent.** Being `protected`, expose it through a public method of your own.

## `Owned<T>`

```csharp
public sealed class Owned<T>(IServiceScopeFactory serviceScopeFactory)
	where T : class
```

Creates a DI scope and resolves `T` as its root, handing back both so the caller controls the
lifetime. `AddXxxCaches()` registers `Owned<>` as an open generic Singleton using `TryAdd`, so a
registration you add first wins.

### `GetScope`

```csharp
public OwnedScope<T> GetScope();
public OwnedScope<T> GetScope(out T service);
```

Both overloads call `IServiceScopeFactory.CreateAsyncScope()` and then
`GetRequiredService<T>()`. If resolution throws, the scope is disposed before the exception
propagates. The `out` overload saves you a `scope.Service` hop:

```csharp
await using var scope = owned.GetScope(out var handler);
var response = await handler.HandleAsync(request, token);
```

<Callout type="note">

CA2000 would normally fire on that `out var handler`. The package ships a
[diagnostic suppressor](/docs/Immediate.Cache/diagnostics) that silences it for this exact
pattern.

</Callout>

## `OwnedScope<T>`

```csharp
public sealed class OwnedScope<T> : IAsyncDisposable
{
	public T Service { get; }
	public ValueTask DisposeAsync();
}
```

The scope and its rooted service. Its constructor is `internal`; instances only come from
`Owned<T>.GetScope`. Disposing it disposes the underlying DI scope, and therefore every scoped
service resolved within it. Always `await using` it.

## Generated members

| Member           | Shape                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Your cache class | `partial class {Name} : ApplicationCache<{Request}, {Response}>` with a public constructor taking `IMemoryCache` and `Owned<IHandler<…>>`                         |
| Registration     | `public static IServiceCollection Add{Identifier}Caches(this IServiceCollection services)` on `CacheServiceCollectionExtensions`, in the project's root namespace |

See [How it works](/docs/Immediate.Cache/how-it-works) for the emitted file names and registration
details.
