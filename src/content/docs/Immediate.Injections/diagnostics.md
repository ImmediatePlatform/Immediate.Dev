---
title: Diagnostics
description: Every INJ diagnostic Immediate.Injections reports, what triggers it, and how to fix it.
order: 13
group: Diagnostics
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Injections ships two analyzers reporting twelve diagnostics, all in the
`ImmediateInjections` category.

| ID                  | Severity | Title                                                                |
| ------------------- | -------- | -------------------------------------------------------------------- |
| [INJ0001](#inj0001) | Error    | RegisterServices method is invalid                                   |
| [INJ0002](#inj0002) | Hidden   | Attribute application is invalid                                     |
| [INJ0003](#inj0003) | Error    | `ServiceType` and `RegistrationStrategy` are incompatible parameters |
| [INJ0004](#inj0004) | Error    | Target class does not implement Service Type                         |
| [INJ0005](#inj0005) | Info     | `RegisterXxx<,>` is redundant when the target type is not generic    |
| [INJ0006](#inj0006) | Error    | `TImplementation` is not the target class                            |
| [INJ0007](#inj0007) | Error    | `UseProxyFactory` cannot be `true` when registering target as self   |
| [INJ0008](#inj0008) | Error    | `UseProxyFactory` cannot be true when registering an open generic    |
| [INJ0009](#inj0009) | Error    | Factory Method does not exist                                        |
| [INJ0010](#inj0010) | Error    | Factory methods must have the correct signature                      |
| [INJ0011](#inj0011) | Error    | `Factory` and `UseProxyFactory` parameters are incompatible          |
| [INJ0012](#inj0012) | Error    | `Factory` cannot be provided when registering an open generic        |

<Callout type="note" title="No code fixes, no suppressors">
This package ships analyzers only. There are no code fix providers, no refactorings and no
diagnostic suppressors — if a lightbulb does not appear on an INJ diagnostic, none is missing.
Every diagnostic except INJ0005 is also marked <code>NotConfigurable</code>, so it cannot be
downgraded or disabled through <code>.editorconfig</code>, <code>NoWarn</code> or a
<code>#pragma</code>. Fix the code instead.
</Callout>

<Callout type="warning" title="Not everything invalid is reported">

Some invalid combinations cause the generator to drop a registration with no diagnostic at all —
most importantly `Factory` or `UseProxyFactory` on a **generic** target class that does not
spell its service type as an unbound `typeof`. See INJ0008 and INJ0012 below.

</Callout>

## INJ0001

**RegisterServices method is invalid** — Error.

> Method `'{0}'` must be a static void method receiving an `IServiceCollection` parameter and
> optionally a `ReadOnlySpan<string>` parameter

A method carrying `[RegisterServices]` does not match either accepted signature. The method must
be `static`, non-`async`, return `void`, and take either `(IServiceCollection)` or
`(IServiceCollection, ReadOnlySpan<string>)`.

```csharp
// Error: not static
[RegisterServices]
public void Register(IServiceCollection services) { }

// Error: returns a value
[RegisterServices]
public static IServiceCollection Register(IServiceCollection services) => services;

// Error: async
[RegisterServices]
public static async void Register(IServiceCollection services) { }

// Error: extra parameter
[RegisterServices]
public static void Register(IServiceCollection services, ReadOnlySpan<string> tags, int x) { }

// Correct
[RegisterServices]
public static void Register(IServiceCollection services) { }
```

See [Manual registration](/docs/Immediate.Injections/manual-registration).

## INJ0002

**Attribute application is invalid** — Hidden.

> Type `'{0}'` has attribute `[{1}]` and will not be registered

The umbrella diagnostic. It is reported on the attribute whenever any of the specific checks
below has failed, and it is what greys the attribute out in the IDE — it carries the
`Unnecessary` tag, so editors render it as dead code.

It is Hidden, so it never appears in build output. If an attribute looks faded, one of INJ0003,
INJ0004, INJ0006, INJ0007, INJ0008, INJ0009, INJ0010, INJ0011 or INJ0012 is also present and
carries the real explanation. INJ0005 does **not** trigger it — that registration is still
emitted.

## INJ0003

**`ServiceType` and `RegistrationStrategy` are incompatible parameters** — Error.

> Type `{0}` has attribute `[{1}]` applied with incompatible `ServiceType` and
> `RegistrationStrategy` parameters

The two properties answer the same question in different ways. Pick one.

```csharp
// Error
[RegisterSingleton(ServiceType = typeof(IService), RegistrationStrategy = RegistrationStrategy.Self)]
public sealed class Service : IService;

// Correct — a single explicit service type
[RegisterSingleton(ServiceType = typeof(IService))]
public sealed class Service : IService;

// Correct — a computed set of service types
[RegisterSingleton(RegistrationStrategy = RegistrationStrategy.SelfAndImplementedInterfaces)]
public sealed class Service : IService;
```

An assembly-level `RegistrationDefaults(RegistrationStrategy = ...)` does not trigger this; only
writing both on the same attribute does.

See [Registration strategies](/docs/Immediate.Injections/registration-strategies).

## INJ0004

**Target class does not implement Service Type** — Error.

> Type `{0}` does not implement Service Type `{1}`

The attributed class is not assignable to the requested service type. Triggers for `ServiceType`
and for the `TService` type argument of both generic forms.

```csharp
public interface IService;

// Error: Service does not implement IService
[RegisterSingleton<IService>]
public sealed class Service;

// Error: arity mismatch
[RegisterSingleton(ServiceType = typeof(IService<>))]
public sealed class Service<T1, T2> : IOther<T1, T2>;
```

For generics the check is done after closing the class over the service type's type arguments,
so `[RegisterSingleton<IService<string>>]` on `Service<T> : IService<T>` is fine — the analyzer
compares `Service<string>` against `IService<string>`.

## INJ0005

**`RegisterXxx<,>` is redundant when the target type is not generic** — Info.

> Specifying `TImplementation` as `{0}` is redundant

The two-type-argument form exists to pick a closed construction of a _generic_ class. On a
non-generic class the second type argument can only be the class itself, so it says nothing.

```csharp
// Info: use [RegisterSingleton<IService>] instead
[RegisterSingleton<IService, Service>]
public sealed class Service : IService;
```

This is the only INJ diagnostic that is neither an error nor `NotConfigurable` — it can be
adjusted in `.editorconfig`, and the registration is emitted either way.

## INJ0006

**`TImplementation` is not the target class** — Error.

> `TImplementation` type `{0}` is not the same as the target type `{1}`

`TImplementation` must be the attributed class or a construction of it. It is not a way to
register some other type.

```csharp
public interface IService;
public sealed class Dummy : IService;

// Error: TImplementation is Dummy, but the attribute is on Service
[RegisterSingleton<IService, Dummy>]
public sealed class Service : IService;

// Correct
[RegisterSingleton<IService<string>, Service<string>>]
public sealed class Service<T> : IService<T>;
```

To register a type you do not own, put the registration in a
[`[RegisterServices]` method](/docs/Immediate.Injections/manual-registration) instead.

## INJ0007

**`UseProxyFactory` cannot be `true` when registering target as self** — Error.

> Cannot register type `{0}` as itself when using a proxy

A proxy registration resolves the implementation from the container. Proxying a type to itself
would call `GetRequiredService<T>()` from inside the factory for `T` — an infinite loop.

All of these are the "self" case:

```csharp
[RegisterSingleton(UseProxyFactory = true)]                                        // defaults to Self
[RegisterSingleton(RegistrationStrategy = RegistrationStrategy.Self, UseProxyFactory = true)]
[RegisterSingleton(ServiceType = typeof(Service), UseProxyFactory = true)]
[RegisterSingleton<Service>(UseProxyFactory = true)]
[RegisterSingleton<Service, Service>(UseProxyFactory = true)]
```

An assembly-level `RegistrationDefaults(RegistrationStrategy = RegistrationStrategy.Self)`
combined with `[RegisterSingleton(UseProxyFactory = true)]` triggers it too.

Use a service type the class merely implements, or
`RegistrationStrategy.SelfAndImplementedInterfaces` — where only the interface registrations are
proxied. See [Factories and proxies](/docs/Immediate.Injections/factories-and-proxies).

## INJ0008

**`UseProxyFactory` cannot be true when registering an open generic** — Error.

> Cannot register type `{0}` using a proxy for an open generic

MSDI cannot build an open-generic service from a factory delegate.

```csharp
public interface IService<T>;

// Error
[RegisterSingleton(ServiceType = typeof(IService<>), UseProxyFactory = true)]
public sealed class Service<T> : IService<T>;
```

<Callout type="warning" title="Only the unbound ServiceType spelling is caught">
Write <code>UseProxyFactory = true</code> on a generic class <em>without</em> an unbound
<code>ServiceType</code> — relying on <code>ImplementedInterfaces</code>,
<code>SelfAndImplementedInterfaces</code> or an assembly default — and no diagnostic fires. The
generator drops the registration and the service is simply missing at runtime. If an attributed
generic class does not appear in the container, look for <code>UseProxyFactory</code> first.
</Callout>

Register a closed construction instead if you need a proxy.

## INJ0009

**Factory Method does not exist** — Error.

> Method `{0}.{1}` specified by the `Factory` parameter does not exist

`Factory` names a method that does not exist on the attributed class. It is a string, so a rename
breaks it silently unless you use `nameof`.

```csharp
// Error
[RegisterSingleton(Factory = "Create")]
public sealed class Service;

// Correct
[RegisterSingleton(Factory = nameof(Create))]
public sealed class Service
{
	public static Service Create(IServiceProvider provider) => new();
}
```

The method must be declared on the attributed class itself — an inherited or extension method
does not satisfy the check.

## INJ0010

**Factory methods must have the correct signature** — Error.

> Method `{0}.{1}` specified by the `Factory` parameter has an invalid signature

A method with that name exists, but its shape is wrong.

| Registration             | Required signature                              |
| ------------------------ | ----------------------------------------------- |
| Unkeyed                  | `static TSelf Method(IServiceProvider)`         |
| Keyed (`ServiceKey` set) | `static TSelf Method(IServiceProvider, object)` |

```csharp
// Error: not static / wrong return type / wrong parameters
public Service Create(IServiceProvider provider) => new();
public static void Create(IServiceProvider provider) { }
public static Service Create() => new();
public static Service Create(IServiceProvider provider, int notAKey) => new();

// Correct, unkeyed
public static Service Create(IServiceProvider provider) => new();

// Correct, keyed
public static Service Create(IServiceProvider provider, object? serviceKey) => new();
```

The return type must be the attributed class, not the service type it is being registered as.

See [Factories and proxies](/docs/Immediate.Injections/factories-and-proxies).

## INJ0011

**`Factory` and `UseProxyFactory` parameters are incompatible** — Error.

> Type `{0}` cannot use both `Factory` and `UseProxyFactory` parameters

Both fill the `ImplementationFactory` slot of a single descriptor, so one registration cannot use
both.

```csharp
// Error
[RegisterSingleton<IService>(Factory = nameof(Create), UseProxyFactory = true)]
public sealed class Service : IService
{
	public static Service Create(IServiceProvider provider) => new();
}
```

<Callout type="tip" title="One legal combination">
When the effective <code>RegistrationStrategy</code> is
<code>SelfAndImplementedInterfaces</code> — set on the attribute or inherited from
<code>RegistrationDefaults</code> — the two do <strong>not</strong> conflict and no diagnostic is
reported. That shape produces two kinds of descriptor: the self registration uses the factory,
and each interface registration proxies to it. It is the supported way to get custom construction
and one shared instance at the same time. See
<a href="/docs/Immediate.Injections/factories-and-proxies#combining-factory-with-useproxyfactory">Factories and proxies</a>.
</Callout>

## INJ0012

**`Factory` cannot be provided when registering an open generic** — Error.

> Cannot register type `{0}` using a factory for an open generic

The mirror of INJ0008. MSDI cannot register an open-generic service with a factory method.

```csharp
public interface IService<T>;

// Error
[RegisterSingleton(ServiceType = typeof(IService<>), Factory = nameof(Create))]
public sealed class Service<T> : IService<T>
{
	public static Service<T> Create(IServiceProvider provider) => new();
}
```

The same caveat as INJ0008 applies: a `Factory` on a generic class with no unbound `ServiceType`
is dropped silently rather than reported. A closed construction —
`[RegisterSingleton<IService<string>>(Factory = nameof(Create))]` — is fine, because the
resulting descriptor is not open.

## Where to go next

- [Attributes reference](/docs/Immediate.Injections/attributes-reference)
- [How it works](/docs/Immediate.Injections/how-it-works)
