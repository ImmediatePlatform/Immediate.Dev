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

Immediate.Handlers targets `Microsoft.Extensions.DependencyInjection.Abstractions` directly. Two
generated extension methods do all the work:

```csharp title="Program.cs"
builder.Services.AddApplicationBehaviors();
builder.Services.AddApplicationHandlers();
```

`AddApplicationHandlers` registers every `[Handler]` class in the assembly.
`AddApplicationBehaviors` registers every type referenced by any `[Behaviors]` attribute in the
assembly — assembly-level, handler-level and bundle attributes alike.

The `Application` in the middle is the assembly identifier: by default the assembly name with `.`, ` `
and `-` removed, overridable with `[assembly: ImmediateAssemblyIdentifier("...")]`. See [The assembly
identifier](/docs/concepts/assembly-identifier) for the derivation rules, and note that the same name is
used by Immediate.Apis, Immediate.Cache and Immediate.Injections — changing it changes all of them at
once.

Both methods live on a generated `HandlerServiceCollectionExtensions` class placed in your project's
root namespace.

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
`TryAddTransient` regardless of what you pass to `AddXxxHandlers`. If you register a behavior
type yourself _before_ calling `AddXxxBehaviors`, `TryAdd` preserves your registration and its
lifetime instead. Otherwise, each handler resolution gets fresh behavior instances.

</Callout>

## What gets registered per handler

For a handler `Application.GetUsersQuery` with request `Query` and response `IEnumerable<User>`:

| Service type                                       | Implementation type            | Lifetime      |
| -------------------------------------------------- | ------------------------------ | ------------- |
| `GetUsersQuery.Handler`                            | `GetUsersQuery.Handler`        | as configured |
| `IHandler<GetUsersQuery.Query, IEnumerable<User>>` | `GetUsersQuery.Handler`        | as configured |
| `GetUsersQuery.HandleBehavior`                     | `GetUsersQuery.HandleBehavior` | as configured |
| `GetUsersQuery` (sealed handlers only)             | `GetUsersQuery`                | as configured |

Streaming handlers register `IStreamingHandler<TRequest, TResponse>` in place of `IHandler<,>`.

The container class in the last row is only registered for [sealed instance
handlers](/docs/Immediate.Handlers/handler-dependencies) — a static handler has nothing to construct.

<Callout type="note">

The concrete `Handler` and the `IHandler<,>` mapping are two independent service descriptors that
happen to share an implementation type. Resolving both in the same scope yields two separate `Handler`
instances. Handlers are stateless, so this is harmless, but it is worth knowing if you register a
handler as a singleton and expect reference equality.

</Callout>

Behaviors are registered as their open generic definition, so
`typeof(LoggingBehavior<,>)` is registered once and the container closes it per handler.

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

Note it is a plain static method rather than an extension method, and it does not register behaviors —
if the handler's pipeline includes any, register those types yourself.

## Registering a subset

`AddXxxHandlers` also accepts tags, which let one assembly's handlers be registered selectively per
host. See [Tagged registration](/docs/Immediate.Handlers/tagged-registration).
