---
title: Diagnostics
description: The IC0001–IC0003 analyzer errors, the CA2000 suppressor, and the compile failures that have no IC diagnostic at all.
order: 8
group: Diagnostics
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Cache ships three analyzer diagnostics, all in the `ImmediateCache` category, all
introduced in release 2.0.

| ID       | Title                                       | Severity | Configurable | Code fix |
| -------- | ------------------------------------------- | -------- | ------------ | -------- |
| `IC0001` | Cache nesting is not allowed                | Error    | No           | None     |
| `IC0002` | Cache Target must be a `[Handler]`          | Error    | No           | None     |
| `IC0003` | Cache Target Handler must have return value | Error    | No           | None     |

<Callout type="note">

All three are marked `NotConfigurable`. Their severity cannot be changed from `.editorconfig`, a
ruleset or `[SuppressMessage]`, and `#pragma warning disable` does not silence them. Each one marks
a condition under which the generator emits nothing, so downgrading them would only trade an
analyzer error for a confusing compiler error.

</Callout>

All three are reported on the **cache class** declaration, and only fire on a class carrying
`[CacheFor<T>]`. The package ships no code fixes.

## IC0001 — Cache nesting is not allowed

> Cache `'{0}'` must not be nested in another type

The generator only accepts top-level cache classes; a nested one is skipped. Move the cache class
out of its containing type — a file-scoped namespace and a `sealed partial class` of its own.

```csharp
// Reports IC0001
public class Outer
{
	[CacheFor<GetUsersQuery>]
	public sealed partial class GetUsersQueryCache { }
}

// Correct
[CacheFor<GetUsersQuery>]
public sealed partial class GetUsersQueryCache { }
```

Note that a nested class _without_ `[CacheFor<>]` is fine; the rule only inspects annotated types.

## IC0002 — Cache Target must be a `[Handler]`

> Cache Target class `'{0}'` is not marked as `[Handler]`

The type argument to `[CacheFor<T>]` must be an Immediate.Handlers handler. Immediate.Cache
explicitly wraps handlers only — it cannot cache an arbitrary service or method.

```csharp
// Reports IC0002 — GetUsersQuery has no [Handler]
[CacheFor<GetUsersQuery>]
public sealed partial class GetUsersQueryCache { }

public sealed partial class GetUsersQuery { … }
```

Add `[Handler]` to the target, or point the attribute at the handler class rather than at its
request or response type.

## IC0003 — Cache Target Handler must have return value

> Cache Target class `'{0}'` must return a value

The target's handle method must return `ValueTask<T>`. A command handler returning bare `ValueTask`
produces no response, so there is nothing to cache.

```csharp
// Reports IC0003
[Handler]
public sealed partial class DeleteUserCommand
{
	private async ValueTask HandleAsync(Command _, CancellationToken token) { … }
}
```

## The CA2000 suppressor

`OwnedDisposableScopeSuppressor` (suppression id `OwnedDisposableScopeSuppression`) suppresses
**CA2000 — Dispose objects before losing scope** on the `out` argument of a call to
`Owned<T>.GetScope(out …)`:

```csharp
await using var scope = owned.GetScope(out var service);
```

CA2000 fires because `service` may be `IDisposable` and is not itself disposed. That is safe here:
the service was resolved as the root of the scope held by the returned `OwnedScope<T>`, so disposing
the scope — which the `await using` does — disposes the service along with everything else the scope
created. Disposing `service` directly would be wrong, not merely redundant.

The suppression is deliberately narrow. It applies only when the receiver of `GetScope` is an
`Immediate.Cache.Shared.Owned<T>`; an `out` parameter from any other method, a returned disposable,
or a `new` disposable is left alone.

## Cache hits and the behavior pipeline

The handler does not run on a cache hit. The cache resolves `IHandler<TRequest, TResponse>`, so the whole
Immediate.Handlers behavior pipeline sits _inside_ the cache miss. See
[How it works](/docs/Immediate.Cache/how-it-works).
