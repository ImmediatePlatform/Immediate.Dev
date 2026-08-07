---
title: Registering with IServiceCollection
description: Wire handlers and behaviors into Microsoft.Extensions.DependencyInjection, and control their lifetimes.
order: 6
group: Guides
sidebar:
  label: Registering with DI
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Handlers targets `Microsoft.Extensions.DependencyInjection.Abstractions` directly. One
generated extension method registers the handlers and their behavior dependencies:

```csharp title="Program.cs"
builder.Services.AddApplicationHandlers();
```

`AddApplicationHandlers` registers every `[Handler]` class in the assembly. For each handler, it also
registers the concrete behavior types that survived the pipeline's constraint and handler-kind
filtering. This covers assembly-level, handler-level and bundle attributes alike; there is no separate
behavior registration call.

The `Application` in the middle is the assembly identifier: by default the assembly name with `.`, ` `
and `-` removed, overridable with `[assembly: ImmediateAssemblyIdentifier("...")]`. See [The assembly
identifier](/docs/concepts/assembly-identifier) for the derivation rules, and note that the same name is
used by Immediate.Apis, Immediate.Cache and Immediate.Injections — changing it changes all of them at
once.

The method lives on a generated `HandlerServiceCollectionExtensions` class placed in your project's
root namespace.

<Callout type="note" title="Upgrading from an earlier release">

Remove any `AddXxxBehaviors()` call from startup. That generated method no longer exists because
`AddXxxHandlers()` now registers the applicable behavior dependencies itself.

</Callout>

## Lifetimes

`AddXxxHandlers` takes an optional lifetime, which defaults to `ServiceLifetime.Scoped`:

```csharp title="Program.cs"
builder.Services.AddApplicationHandlers(ServiceLifetime.Transient);
```

A single handler can opt out of the app-wide default by passing a lifetime to `[Handler]`:

```csharp title="GetConfigurationQuery.cs"
[Handler(ServiceLifetime.Singleton)]
public static partial class GetConfigurationQuery
{
	// ..
}
```

The attribute wins. The generated registration code emits the literal lifetime for that handler and
ignores whatever was passed to `AddXxxHandlers`.

<Callout type="warning" title="Generated behavior registrations are transient">

The lifetime argument applies to handlers only. Generated behavior registrations use
`TryAddTransient` regardless of what you pass to `AddXxxHandlers`. If you register the same concrete
closed behavior type yourself _before_ calling `AddXxxHandlers`, `TryAdd` preserves your registration
and its lifetime instead. Otherwise, each handler resolution gets fresh behavior instances.

</Callout>

## What gets registered per handler

For a handler `Application.GetUsersQuery` with request `Query` and response `IEnumerable<User>`:

| Service type                                              | Implementation type            | Lifetime      |
| --------------------------------------------------------- | ------------------------------ | ------------- |
| `GetUsersQuery.Handler`                                   | `GetUsersQuery.Handler`        | as configured |
| `IHandler<GetUsersQuery.Query, IEnumerable<User>>`        | `GetUsersQuery.Handler`        | as configured |
| `GetUsersQuery.HandleBehavior`                            | `GetUsersQuery.HandleBehavior` | as configured |
| `GetUsersQuery` (sealed handlers only)                    | `GetUsersQuery`                | as configured |
| `LoggingBehavior<GetUsersQuery.Query, IEnumerable<User>>` | itself                         | transient     |

Streaming handlers register `IStreamingHandler<TRequest, TResponse>` in place of `IHandler<,>`.

The container class in the last row is only registered for [sealed instance
handlers](/docs/Immediate.Handlers/handler-dependencies) — a static handler has nothing to construct.

<Callout type="note">

The concrete `Handler` and the `IHandler<,>` mapping are two independent service descriptors that
happen to share an implementation type. Resolving both in the same scope yields two separate `Handler`
instances. Handlers are stateless, so this is harmless, but it is worth knowing if you register a
handler as a singleton and expect reference equality.

</Callout>

Behavior registrations are concrete types closed for the handler's request and response. For example,
the same `LoggingBehavior<,>` attribute entry produces separate
`LoggingBehavior<GetUsersQuery.Query, IEnumerable<User>>` and
`LoggingBehavior<CreateUserCommand.Command, ValueTuple>` registrations when it applies to both
handlers.

All generated descriptors use `TryAdd`, so calling `AddXxxHandlers` repeatedly is idempotent. Existing
registrations for the same service type are preserved.

## Registering a single handler

Each handler also gets its own static `AddHandlers` method, which is what `AddXxxHandlers` calls
internally. It is public, so you can register one handler in isolation — useful in tests:

```csharp title="GetUsersQueryTests.cs"
var services = new ServiceCollection();
services.AddSingleton<UsersService>();
GetUsersQuery.AddHandlers(services);

var handler = services.BuildServiceProvider()
	.GetRequiredService<GetUsersQuery.Handler>();
```

It is a plain static method rather than an extension method. It registers the handler's concrete
behavior dependencies too, so the isolated registration is sufficient for resolving its generated
pipeline.

## Registering a subset

`AddXxxHandlers` also accepts tags, which let one assembly's handlers be registered selectively per
host. See [Tagged registration](/docs/Immediate.Handlers/tagged-registration).
