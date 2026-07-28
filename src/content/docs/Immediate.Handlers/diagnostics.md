---
title: Diagnostics
description: Every IHR diagnostic Immediate.Handlers reports, what triggers it, and how to fix it.
order: 11
group: Diagnostics
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Handlers ships 20 analyzer diagnostics in the `ImmediateHandler` category, all prefixed
`IHR`. Errors marked _not configurable_ cannot be suppressed or downgraded in `.editorconfig` — they
describe shapes the generator physically cannot emit code for.

| ID      | Title                                                                              | Severity | Configurable |
| ------- | ---------------------------------------------------------------------------------- | -------- | ------------ |
| IHR0001 | Handler type must implement a `Handle`/`HandleAsync` method                        | Error    | No           |
| IHR0002 | Handler method must return a `ValueTask`, `ValueTask<T>`, or `IAsyncEnumerable<T>` | Error    | No           |
| IHR0005 | Handler nesting is not allowed                                                     | Error    | No           |
| IHR0006 | Behaviors must inherit from `Behavior<,>` or `StreamingBehavior<,>`                | Error    | No           |
| IHR0007 | Behaviors must not have more than two generic parameters                           | Error    | No           |
| IHR0008 | Behaviors must use unbound generics                                                | Error    | No           |
| IHR0010 | Handler method must be unique                                                      | Error    | No           |
| IHR0011 | Handler method must be private                                                     | Error    | No           |
| IHR0012 | Handler method should use `CancellationToken`                                      | Warning  | Yes          |
| IHR0013 | `IHandler<,>` or `IStreamingHandler<,>` is missing a concrete implementation       | Warning  | Yes          |
| IHR0014 | Handler method is missing request parameter                                        | Error    | No           |
| IHR0015 | Handler method has too many parameters                                             | Error    | No           |
| IHR0016 | Handler type should be `sealed`                                                    | Warning  | Yes          |
| IHR0017 | Instance members of handler types should be `private`                              | Warning  | Yes          |
| IHR0018 | Handler types should be `static`                                                   | Warning  | Yes          |
| IHR0019 | Static handler may be converted to a sealed handler                                | Info     | Yes          |
| IHR0020 | Behavior has incorrect type argument                                               | Warning  | Yes          |
| IHR0021 | Behavior has invalid constraints                                                   | Error    | No           |
| IHR0022 | Non-static handler should not be used directly                                     | Warning  | Yes          |
| IHR0023 | Invalid assembly identifier                                                        | Error    | No           |

There is no IHR0003, IHR0004 or IHR0009. The first two were never shipped; IHR0009 was removed in 3.0.

## Handler shape

### IHR0001 — Handler type must implement a `Handle`/`HandleAsync` method

A class marked `[Handler]` has no method named `Handle` or `HandleAsync`. Both names are accepted;
neither is preferred.

**Code fix:** _Add HandleAsync method_. It generates a stub, inferring the request and response from
nested records whose names end in `Query`, `Command` or `Response`, and falling back to `object` and
`int` when it finds none.

### IHR0002 — Handler method must return a `ValueTask`, `ValueTask<T>`, or `IAsyncEnumerable<T>`

Most often a handle method returning `Task<T>`. Mark the method `async` and change the return type to
`ValueTask<T>`. A bare `ValueTask` is valid and produces a `ValueTuple` response;
`IAsyncEnumerable<T>` makes the handler a [streaming
handler](/docs/Immediate.Handlers/streaming-handlers).

### IHR0005 — Handler nesting is not allowed

The `[Handler]` class is declared inside another type. Move it to the namespace level. The request and
response types may still be nested inside the handler.

### IHR0010 — Handler method must be unique

The class declares more than one candidate — two overloads, or one `Handle` and one `HandleAsync`.
There is no disambiguation mechanism; delete or rename all but one.

### IHR0011 — Handler method must be private

Reported on any handle method that is not `private`. Consumers use the generated `Handler` class.

### IHR0012 — Handler method should use `CancellationToken`

The last parameter is not a `CancellationToken`, so the request cannot be cancelled. Add one as the
final parameter, or suppress the rule if the work is genuinely synchronous and cheap.

### IHR0014 — Handler method is missing request parameter

The handle method has no parameters, or only a `CancellationToken`. Every handler needs a request type,
even an empty `record Query;`.

### IHR0015 — Handler method has too many parameters

Reported on **instance** handlers, whose handle method must take the request and, optionally, a trailing
`CancellationToken` — nothing else. Dependencies belong on the primary constructor. Static handlers may
take any number of parameters between the request and the token.

## Class shape

### IHR0016 — Handler type should be `sealed`

The handle method is an instance method but the class is not `sealed`. Sealing prevents subclassing that
the generator has no way to account for.

### IHR0017 — Instance members of handler types should be `private`

A non-`private` instance member on a handler container. Static members, nested types, constructors and
property accessors are exempt. The container is an implementation detail; exposing members on it invites
callers to bypass the pipeline.

### IHR0018 — Handler types should be `static`

The handle method is `static` but the class is not. Either make the class `static`, or drop `static`
from the method and give the class a primary constructor.

### IHR0019 — Static handler may be converted to a sealed handler

Informational. By default it fires only for a static handler that takes dependencies. Set
`dotnet_diagnostic.IHR0019.enable_when_handler_has_no_dependencies = true` in `.editorconfig` to have it
fire for every static handler.

**Code fix:** _Convert to instance handler_ — rewrites the class to the sealed form, moving the
dependency parameters onto a primary constructor.

### IHR0022 — Non-static handler should not be used directly

A `[Handler]` class is used as a parameter, field, property, method return type, base type, or generic
type argument. The generated `X.Handler` is almost certainly what was meant; using the container
directly skips the entire behavior pipeline.

## Behaviors

### IHR0006 — Behaviors must inherit from `Behavior<,>` or `StreamingBehavior<,>`

A type listed in `[Behaviors]` does not derive from either base class.

### IHR0007 — Behaviors must not have more than two generic parameters

Zero, one and two type parameters are all valid; three or more is not.

### IHR0008 — Behaviors must use unbound generics

Write `typeof(LoggingBehavior<,>)`, not `typeof(LoggingBehavior<Query, Response>)`. The generator closes
the type per handler.

### IHR0020 — Behavior has incorrect type argument

A behavior listed **on a handler** has constraints or fixed type arguments that the handler's request or
response does not satisfy, so it will be dropped from that handler's pipeline. The location points at
the specific `typeof(...)` argument. Assembly-wide behaviors are never reported here — filtering them
per handler is the point of constraints.

### IHR0021 — Behavior has invalid constraints

A behavior type parameter carries a `class`, `struct`, `unmanaged`, `notnull` or `new()` constraint.
Only constraints to a concrete interface, class or record are supported.

## Consumption and assembly

### IHR0013 — `IHandler<,>` / `IStreamingHandler<,>` is missing a concrete implementation

A method or constructor parameter is typed as `IHandler<TRequest, TResponse>`, but no generated
`Handler` in the compilation implements it. Usually a typo in the request or response type, or a handler
that failed to generate. Not reported when either type argument is an open type parameter.

### IHR0023 — Invalid assembly identifier

The value passed to `[assembly: ImmediateAssemblyIdentifier(...)]` is not a valid C# identifier, or
starts with `@`. The generator falls back to the assembly name when this happens.

## Suppressors

`MarkHandleMethodAsStaticSuppressor` suppresses **CA1822** ("Mark members as static") on handle methods
— but only when
`dotnet_diagnostic.IHR0019.enable_when_handler_has_no_dependencies = true` is set. With the option at
its default of `false`, the suppressor does nothing and an instance handle method with no dependencies
will still draw CA1822.

## Removed rules

**IHR0009** was removed in release 3.0 and is no longer reported by anything. If you have a
`#pragma warning disable IHR0009` or an `.editorconfig` entry for it, it is dead and can be deleted.

## Behavior not applied checklist

When a behavior silently does not run, work through these in order:

1. **Nullability mismatch.** Nullable reference annotations are part of type matching. A behavior fixed
   to `IEnumerable<User>` does not attach to a handler returning `ValueTask<IEnumerable<User>?>`.
2. **Constraint mismatch.** `where TRequest : IFoo` excludes every handler whose request does not
   implement `IFoo`. Check the generated `Handler` constructor: if the behavior is not a parameter, it
   was filtered out.
3. **Handler-level `[Behaviors]` replaced the assembly list.** A `[Behaviors]` attribute on the handler
   — including one applied through a bundle attribute — discards the assembly-wide list entirely.
4. **Tag mismatch.** The handler was filtered out of `AddXxxHandlers(tags: ...)`, so nothing about it is
   registered, pipeline included.
5. **Abstract behavior class.** If a listed behavior is `abstract`, generation aborts for the affected
   handler — or for the whole assembly when the attribute is assembly-level — and no IHR diagnostic
   fires. The symptom is a missing `Handler` class, not a missing behavior.
6. **`AddXxxBehaviors()` was never called.** The pipeline is compiled in, but the behavior types are not
   in the container, so resolving the handler throws.

<Callout type="tip">

The fastest answer is usually the generated code itself. The constructor of `X.Handler` lists exactly
the behaviors that were attached, in reverse pipeline order. See [How it
works](/docs/Immediate.Handlers/how-it-works).

</Callout>
