---
title: Handlers and the behavior pipeline
description: The request-to-response mental model that Immediate.Validations and Immediate.Cache both build on.
order: 2
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Almost everything in ImmediatePlatform sits somewhere on one path: a request goes in, a chain of
behaviors wraps the call, your handler method runs, and a response comes back. Understanding
where each package attaches to that chain explains most of the platform's behavior.

## The chain

```text
caller
  └─ GetUsersQuery.Handler          ← generated; what you inject
       └─ LoggingBehavior           ← first in [Behaviors(...)] = outermost
            └─ ValidationBehavior
                 └─ HandleBehavior  ← generated; calls your method
                      └─ GetUsersQuery.HandleAsync(...)   ← your code
```

The generated `Handler` class is the only piece consuming code touches. Its constructor takes
the generated `HandleBehavior` plus one parameter for each behavior that applies, wires them
into a chain in the constructor, and delegates `HandleAsync` to the outermost link.

Three consequences follow directly from that shape:

- **The chain is built at compile time, not resolved at runtime.** Which behaviors apply to
  which handler is decided by the generator from the `[Behaviors]` list and each behavior's
  generic constraints. There is no service-locator lookup and no ordering surprise at startup.
- **Order is the order you wrote.** The first type listed in `[Behaviors(...)]` is the outermost
  link, so it sees the request first and the response last.
- **Every link is a real DI service.** A behavior that cannot be resolved is a runtime DI
  failure, not a silently skipped step.

## Where each package attaches

**Immediate.Handlers** owns the chain itself: the `[Handler]` and `[Behaviors]` attributes, the
`Behavior<,>` and `StreamingBehavior<,>` base classes, and the generated `Handler` /
`HandleBehavior` pair. See [Creating behaviors](/docs/Immediate.Handlers/creating-behaviors).

**Immediate.Validations** is a behavior. `ValidationBehavior<,>` goes in your assembly-wide
`[Behaviors]` list, validates the request before calling `Next`, and throws
`ValidationException` when the request is invalid. Because it is an ordinary link in the chain,
its position matters: anything listed before it runs on invalid requests too. See
[Integrating with Immediate.Handlers](/docs/Immediate.Validations/immediate-handlers-integration).

**Immediate.Apis** sits _outside_ the chain. It generates a minimal-API endpoint that resolves
`GetUsersQuery.Handler` from the request's DI scope and awaits it. The whole pipeline runs
inside one HTTP request. See [How it works](/docs/Immediate.Apis/how-it-works).

**Immediate.Cache** also sits outside the chain, and deliberately so. It wraps the entire
`Handler` — pipeline included — rather than inserting a link into it, so a cache hit skips every
behavior as well as your handler method. It is registered as a singleton and mints a fresh DI
scope per handler execution. See [How it works](/docs/Immediate.Cache/how-it-works).

<Callout type="tip" title="Why Cache is not a behavior">
A caching behavior would have to sit inside the chain, which means every logging, telemetry and
validation behavior would still execute on a cache hit — and the cache would be scoped to the
handler's lifetime rather than the application's. Wrapping the handler avoids both problems.
</Callout>

## Streaming

A handler that returns `IAsyncEnumerable<T>` is a _streaming_ handler. It gets the same
treatment, with `IStreamingHandler<,>` in place of `IHandler<,>` and `StreamingBehavior<,>` in
place of `Behavior<,>`. Streaming and non-streaming behaviors coexist in one `[Behaviors]` list;
each attaches only to the handlers it matches. See
[Streaming handlers](/docs/Immediate.Handlers/streaming-handlers).

## When a behavior does not run

Because matching happens at compile time against generic constraints, a behavior that silently
does not appear in a pipeline almost always failed a match. The
[Immediate.Handlers diagnostics page](/docs/Immediate.Handlers/diagnostics) closes with a
checklist for exactly this; the two that catch people out most often are nullable-annotation
mismatches and a handler-level `[Behaviors]` attribute replacing the assembly-wide list rather
than adding to it.
