---
title: Factories and proxies
description: Construct a service yourself with Factory, or forward one registration to another with UseProxyFactory.
order: 6
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Two properties change _how_ a registration produces its instance rather than _what_ it is
registered as. `Factory` supplies your own construction code. `UseProxyFactory` forwards to
another registration instead of constructing anything.

## `Factory`

`Factory` names a **static method on the attributed class** that builds the instance. The
generator emits it as a method group in the `ImplementationFactory` slot.

```csharp title="FactoryService.cs"
using Immediate.Injections.Shared;
using Microsoft.Extensions.DependencyInjection;

[RegisterSingleton]
public sealed class FactoryDependency;

public interface IFactoryService
{
	FactoryDependency Dependency { get; }
}

[RegisterTransient<IFactoryService>(Factory = nameof(Create))]
public sealed class FactoryService(FactoryDependency dependency) : IFactoryService
{
	public FactoryDependency Dependency { get; } = dependency;

	public static FactoryService Create(IServiceProvider provider) =>
		new(provider.GetRequiredService<FactoryDependency>());
}
```

```csharp title="Generated output"
ServiceDescriptor.Transient(typeof(IFactoryService), FactoryService.Create);
```

### The required signature

| Registration | Signature                                       |
| ------------ | ----------------------------------------------- |
| Unkeyed      | `static TSelf Method(IServiceProvider)`         |
| Keyed        | `static TSelf Method(IServiceProvider, object)` |

Four things the analyzer checks:

- The method must be `static`. Instance methods do not qualify.
- The return type must be the attributed class itself — not the service type, not a base class.
- The parameter list must match exactly. An extra parameter, a missing one, or a wrong type is
  [INJ0010](/docs/Immediate.Injections/diagnostics#inj0010).
- The method must exist on the attributed class, or it is
  [INJ0009](/docs/Immediate.Injections/diagnostics#inj0009).

Use `nameof(...)` rather than a string literal so a rename cannot silently break it.

Keyed registrations use the two-parameter overload, and that second parameter carries the key
the caller requested — see [Keyed services](/docs/Immediate.Injections/keyed-services#keyed-factories).

<Callout type="note">
<code>Factory</code> is not available on a generic target class, because MSDI cannot build an
open generic from a delegate. See
<a href="/docs/Immediate.Injections/open-generics">Open generics</a> — some of those cases fail
silently.
</Callout>

## `UseProxyFactory`

`UseProxyFactory = true` makes the registration resolve through the container instead of
constructing anything. The generated implementation factory is
`ServiceProviderServiceExtensions.GetRequiredService<TImplementation>` — or
`ServiceProviderKeyedServiceExtensions.GetRequiredKeyedService<TImplementation>` when the
registration is keyed.

```csharp title="Proxy.cs"
using Immediate.Injections.Shared;

public interface IService;

[RegisterSingleton]                                  // registers Service -> Service
[RegisterSingleton<IService>(UseProxyFactory = true)] // registers IService -> resolve Service
public sealed class Service : IService;
```

```csharp title="Generated output"
ServiceDescriptor.Singleton(
	typeof(IService),
	ServiceProviderServiceExtensions.GetRequiredService<Service>
);
```

<Callout type="warning" title="A proxy registration does not register the implementation">
The descriptor above says "to get an <code>IService</code>, ask the container for a
<code>Service</code>". If nothing else registers <code>Service</code>, resolution throws at
runtime — <code>GetRequiredService</code> inside the factory finds nothing. Every proxy needs a
real registration to point at.
</Callout>

Two combinations are rejected outright:

- **Proxying to self.** `[RegisterSingleton<Service>(UseProxyFactory = true)]` on `Service`
  would resolve `Service` by resolving `Service` — an infinite loop. That is
  [INJ0007](/docs/Immediate.Injections/diagnostics#inj0007). The same error fires for
  `RegistrationStrategy.Self`, for `ServiceType = typeof(Service)`, and for a bare
  `[RegisterSingleton(UseProxyFactory = true)]`, which resolves to `Self`.
- **Proxy plus factory**, in the generic attribute forms and in most non-generic ones — the two
  compete for the same `ImplementationFactory` slot. That is
  [INJ0011](/docs/Immediate.Injections/diagnostics#inj0011). There is one exception, below.

## The shared-instance pattern

The reason `UseProxyFactory` exists: registering a class as itself _and_ as its interfaces
normally produces one descriptor per service type, and MSDI treats each as its own instance —
so a singleton registered three ways gives you three objects. Proxying the interfaces at the
concrete registration collapses them into one.

```csharp title="SharedService.cs"
using Immediate.Injections.Shared;

public interface ISharedService
{
	Guid Id { get; }
}

[RegisterSingleton(
	RegistrationStrategy = RegistrationStrategy.SelfAndImplementedInterfaces,
	UseProxyFactory = true
)]
public sealed class SharedService : ISharedService
{
	public Guid Id { get; } = Guid.NewGuid();
}
```

```csharp title="Generated output"
ServiceDescriptor.Singleton(typeof(SharedService), typeof(SharedService));
ServiceDescriptor.Singleton(
	typeof(ISharedService),
	ServiceProviderServiceExtensions.GetRequiredService<SharedService>
);
```

`GetRequiredService<SharedService>()` and `GetRequiredService<ISharedService>()` now return the
same object. The self registration is never proxied — that would be INJ0007 — so the pair is
always "one real registration, N forwarding ones".

This is the combination to set as an assembly-wide default when migrating from a library whose
default behaved this way; see
[Assembly-wide defaults](/docs/Immediate.Injections/assembly-defaults).

### With `ImplementedInterfaces`

The same works without the self registration, but then something else must register the concrete
type:

```csharp title="ProxyOnly.cs"
[RegisterSingleton]
[RegisterSingleton(
	RegistrationStrategy = RegistrationStrategy.ImplementedInterfaces,
	UseProxyFactory = true
)]
public sealed class SharedService : ISharedService;
```

## Combining `Factory` with `UseProxyFactory`

<Callout type="tip" title="The one place INJ0011 does not fire">
<code>Factory</code> and <code>UseProxyFactory</code> <em>can</em> be used together when the
effective strategy is <code>SelfAndImplementedInterfaces</code>. It is the only shape where the
two do not collide: the self registration takes the factory, and the interface registrations
take the proxy. Every other strategy is
<a href="/docs/Immediate.Injections/diagnostics#inj0011">INJ0011</a>.
</Callout>

```csharp title="FactoryWithProxy.cs"
using Immediate.Injections.Shared;
using Microsoft.Extensions.DependencyInjection;

public interface IService;

[RegisterSingleton(
	RegistrationStrategy = RegistrationStrategy.SelfAndImplementedInterfaces,
	Factory = nameof(BuildService),
	UseProxyFactory = true
)]
public sealed class Service : IService
{
	public static Service BuildService(IServiceProvider sp) => new();
}
```

```csharp title="Generated output"
ServiceDescriptor.Singleton(typeof(Service), Service.BuildService);
ServiceDescriptor.Singleton(
	typeof(IService),
	ServiceProviderServiceExtensions.GetRequiredService<Service>
);
```

That gives you custom construction _and_ one shared instance behind every interface.

<Callout type="note" title="An assembly default of UseProxyFactory yields to Factory">
When <code>UseProxyFactory</code> comes from
<code>[assembly: RegistrationDefaults(UseProxyFactory = true)]</code> rather than from the
attribute, and the attribute names a <code>Factory</code>, the default is ignored and the factory
wins. Write <code>UseProxyFactory = true</code> on the attribute to get both.
</Callout>

## Where to go next

- [Keyed services](/docs/Immediate.Injections/keyed-services)
- [Assembly-wide defaults](/docs/Immediate.Injections/assembly-defaults)
- [Diagnostics](/docs/Immediate.Injections/diagnostics)
