---
title: Reading and writing cached data
description: Read cached responses with GetValue, invalidate with SetValue and RemoveValue, and apply read-modify-write updates with TransformValue.
order: 3
group: Guides
sidebar:
  label: Reading and writing
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

A generated cache exposes three public methods and one protected one. All four take the **request**,
not the key — the cache calls your `TransformKey` for you.

| Member           | Signature                                                                                                                                                        | Visibility  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `GetValue`       | `ValueTask<TResponse> GetValue(TRequest request, CancellationToken cancellationToken = default)`                                                                 | `public`    |
| `SetValue`       | `void SetValue(TRequest request, TResponse value)`                                                                                                               | `public`    |
| `RemoveValue`    | `void RemoveValue(TRequest request)`                                                                                                                             | `public`    |
| `TransformValue` | `ValueTask<TResponse> TransformValue(TRequest request, Func<TResponse, CancellationToken, ValueTask<TResponse>> transformer, CancellationToken token = default)` | `protected` |

<Callout type="warning">

`SetValue` and `RemoveValue` return `void`, not a task. Do not `await` them — earlier versions of
this page and the package readme showed `await cache.SetValue(...)`, which does not compile.

</Callout>

## Reading

```csharp
var response = await cache.GetValue(request, token);
```

If a value is cached it is returned immediately. Otherwise the cache creates a temporary DI scope,
resolves the handler in it, executes it, stores the response, and disposes the scope.

<Callout type="note">

If simultaneous requests are made while the handler is executing, they wait for the first handler
to complete rather than executing the handler a second, simultaneous time.

</Callout>

## Writing

```csharp
cache.SetValue(request, response);
```

`SetValue` stores a response without executing the handler. It works on a key that has never been
requested, which makes it useful for priming a cache from data you already have.

<Callout type="note">

If a handler is running for this request, it is cancelled, and every caller waiting on that handler
immediately receives the value you supplied.

</Callout>

## Invalidating

```csharp
cache.RemoveValue(request);
```

`RemoveValue` discards the stored response so that the next `GetValue` re-executes the handler.

<Callout type="warning" title="RemoveValue during an in-flight execution restarts the handler">

If a handler is currently running for this request, its `CancellationToken` is signalled and the
running execution is abandoned — but the cache immediately starts the handler again, and callers
already awaiting `GetValue` stay awaiting and receive the result of the _restarted_ execution. They
are not cancelled. Expect your handler to observe an `OperationCanceledException` on the first
attempt and to run to completion on the second.

</Callout>

<Callout type="note">

`RemoveValue` clears the cached response but does not evict the `IMemoryCache` entry itself; the
entry remains, still subject to its expiration policy. Calling `RemoveValue` for a key that was
never requested creates the entry as a side effect.

</Callout>

## Read-modify-write with `TransformValue`

`TransformValue` reads the current value (waiting on an in-flight handler execution if there is
one), passes it to your transformer, and stores the result. It is `protected`, so a cache author
wraps it in a purpose-built public method:

```csharp title="GetUserCache.cs"
[CacheFor<GetUser>]
public sealed partial class GetUserCache
{
	protected override string TransformKey(GetUser.Query request) =>
		$"GetUser({request.UserId})";

	public ValueTask<GetUser.Response> Rename(
		GetUser.Query request,
		string newName,
		CancellationToken token = default
	) =>
		TransformValue(
			request,
			(response, _) => ValueTask.FromResult(response with { Name = newName }),
			token
		);
}
```

<Callout type="danger" title="The transformer must be idempotent">

`TransformValue` writes optimistically: it re-reads the cached value after your transformer
returns, and if anything replaced it in the meantime — a concurrent `SetValue`, `RemoveValue` or
another `TransformValue` — it throws the result away and **runs your transformer again** against
the new value. Your transformer may therefore execute any number of times for a single call. Keep
it a pure function of its input: no database writes, no counters, no logging you would be
surprised to see twice.

</Callout>

If nothing is cached when `TransformValue` is called, it first triggers a normal handler execution
to produce a value, then transforms it.

## Concurrency and cancellation semantics

These rules follow from the shared, per-key execution slot that backs every cache entry.

### One execution per key

Concurrent `GetValue` calls for the same key coalesce onto a single handler execution. Every caller
receives the identical response instance.

### Your token cancels only you

The `CancellationToken` you pass to `GetValue` is applied to _your_ await, not to the shared handler
execution. Cancelling it makes your `GetValue` throw, while the handler keeps running for the
remaining callers and still populates the cache — so a subsequent `GetValue` finds the value
already there.

This also means a handler with no callers left continues to completion rather than being torn down.
Only `SetValue` and `RemoveValue` cancel the shared execution.

### Exceptions reach every waiter

If the handler throws, the exception is propagated to every caller awaiting that key. The failure
is not cached: the next `GetValue` starts a fresh execution.

### Everything is per-process

The backing store is `IMemoryCache`. Coalescing, invalidation and transforms all apply to a single
process only; nothing is broadcast to other instances.

Next: [configuring cache entries](/docs/Immediate.Cache/cache-entry-options).
