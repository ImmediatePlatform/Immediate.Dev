---
title: Open generics
description: Register a generic class once and let the container close it for every type argument.
order: 5
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

A generic class is registered as an **open generic** — one descriptor covering every closed
construction. MSDI closes it on demand, so `IRepository<Todo>` and `IRepository<User>` both
resolve from a single registration.

## Registering against an open-generic interface

Use `ServiceType` with an unbound `typeof`:

```csharp title="Repository.cs"
using Immediate.Injections.Shared;

public interface IRepository<T>
{
	Type ElementType { get; }
}

[RegisterTransient(ServiceType = typeof(IRepository<>))]
public sealed class Repository<T> : IRepository<T>
{
	public Type ElementType => typeof(T);
}
```

```csharp title="Generated output"
ServiceDescriptor.Transient(typeof(IRepository<>), typeof(Repository<>));
```

Every closed construction now resolves without further registration:

```csharp
var todos = provider.GetRequiredService<IRepository<Todo>>();   // Repository<Todo>
var users = provider.GetRequiredService<IRepository<User>>();   // Repository<User>
```

There is no generic-attribute equivalent of this: `[RegisterTransient<IRepository<>>]` is not
legal C#, which is exactly why `ServiceType` still exists on the non-generic form.

The arities must match. `typeof(IRepository<>)` on a class with two type parameters, or a
service type the class does not implement, is
[INJ0004](/docs/Immediate.Injections/diagnostics#inj0004).

## Registering the class as itself

A bare attribute on a generic class registers the open generic against itself:

```csharp title="Cache.cs"
using Immediate.Injections.Shared;

[RegisterSingleton]
public sealed class Cache<T>;
```

```csharp title="Generated output"
ServiceDescriptor.Singleton(typeof(Cache<>), typeof(Cache<>));
```

## Closed constructions

If you want just one closed construction rather than the open generic, name it explicitly with
either the two-type-argument attribute form or a bound `ServiceType`:

```csharp title="Closed.cs"
using Immediate.Injections.Shared;

// Registers IRepository<Todo> -> Repository<Todo>
[RegisterScoped<IRepository<Todo>, Repository<Todo>>]
public sealed class Repository<T> : IRepository<T>;
```

```csharp title="ClosedServiceType.cs"
// Also registers IRepository<Todo> -> Repository<Todo>
[RegisterScoped(ServiceType = typeof(IRepository<Todo>))]
public sealed class Repository<T> : IRepository<T>;
```

Both forms may be repeated to register several closed constructions of the same class.

## Strategies on a generic class

`ImplementedInterfaces` and `SelfAndImplementedInterfaces` work on generic classes, but they
filter the interface list hard. An interface is included only if it is generic, has the **same
arity** as the class, and is closed over the class's own type parameters.

```csharp title="Filtering.cs"
using Immediate.Injections.Shared;

public interface IMarker;
public interface IOne<T>;
public interface ITwo<T1, T2>;

[RegisterScoped(RegistrationStrategy = RegistrationStrategy.SelfAndImplementedInterfaces)]
public sealed class Service<T1, T2> : IMarker, IOne<T1>, ITwo<T1, T2>;
```

Only two registrations are emitted:

```csharp title="Generated output"
ServiceDescriptor.Scoped(typeof(Service<,>), typeof(Service<,>));
ServiceDescriptor.Scoped(typeof(ITwo<,>), typeof(Service<,>));
```

`IMarker` is skipped because it is not generic. `IOne<T1>` is skipped because its arity does not
match the class's. The same rule drops an interface closed over a concrete type — a
`Service<T> : IOther<int>` does not get an `IOther<>` registration, because `int` is not one of
the class's type parameters.

If you need those, add explicit attributes for them alongside the strategy.

## What is not supported

MSDI cannot build an open-generic service from a factory delegate, so neither `Factory` nor
`UseProxyFactory` works on a generic target class.

```csharp title="NotSupported.cs"
// INJ0012 — Factory with an open-generic ServiceType
[RegisterScoped(ServiceType = typeof(IRepository<>), Factory = nameof(Create))]

// INJ0008 — UseProxyFactory with an open-generic ServiceType
[RegisterScoped(ServiceType = typeof(IRepository<>), UseProxyFactory = true)]
```

<Callout type="warning" title="Some of these fail silently">
<a href="/docs/Immediate.Injections/diagnostics#inj0008">INJ0008</a> and
<a href="/docs/Immediate.Injections/diagnostics#inj0012">INJ0012</a> only fire when the open
generic is spelled as an unbound <code>ServiceType</code>. Write <code>Factory</code> or
<code>UseProxyFactory</code> on a generic class <em>without</em> a <code>ServiceType</code> —
relying on <code>Self</code>, <code>ImplementedInterfaces</code> or the assembly default instead
— and the generator drops the registration with no diagnostic at all. If a generic class you
attributed is missing from the container, check for a <code>Factory</code> or
<code>UseProxyFactory</code> on it first.
</Callout>

Closed constructions are unaffected: `[RegisterScoped<IRepository<Todo>>]` on `Repository<T>` may
use a factory, because the resulting descriptor is not open.

## Where to go next

- [Factories and proxies](/docs/Immediate.Injections/factories-and-proxies)
- [Registration strategies](/docs/Immediate.Injections/registration-strategies)
- [Diagnostics](/docs/Immediate.Injections/diagnostics)
