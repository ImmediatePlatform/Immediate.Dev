---
title: Registration strategies
description: Choose which service types a class is registered as, and what happens when a registration already exists.
order: 3
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Two independent knobs control registration. `RegistrationStrategy` decides **which service
types** a class is registered as. `DuplicateStrategy` decides **what happens** when the
collection already contains a registration for one of them.

## `ServiceType` vs `RegistrationStrategy`

The non-generic attribute form offers both, and they are mutually exclusive. Setting both is
[INJ0003](/docs/Immediate.Injections/diagnostics#inj0003) — an error, and nothing is emitted.

```csharp
// Register as exactly one service type
[RegisterScoped(ServiceType = typeof(ITodoRepository))]

// Register as a computed set of service types
[RegisterScoped(RegistrationStrategy = RegistrationStrategy.ImplementedInterfaces)]

// Error: INJ0003
[RegisterScoped(ServiceType = typeof(ITodoRepository), RegistrationStrategy = RegistrationStrategy.Self)]
```

`ServiceType` is the non-generic equivalent of `[RegisterScoped<ITodoRepository>]`. Prefer the
generic form when the service type is known at compile time; `ServiceType` earns its keep for
open generics, where `typeof(IRepository<>)` has no generic-attribute equivalent.

## The four `RegistrationStrategy` members

| Member                         | Registers as                                                      |
| ------------------------------ | ----------------------------------------------------------------- |
| `None`                         | The `ServiceType`, if one is given; otherwise identical to `Self` |
| `Self`                         | The attributed class itself                                       |
| `ImplementedInterfaces`        | Every interface the class implements — **not** the class itself   |
| `SelfAndImplementedInterfaces` | The class itself **and** every interface it implements            |

`None` is the enum's zero value and acts as the "nothing chosen" sentinel. You should not write
it explicitly; leaving `RegistrationStrategy` unset produces the same result.

### How the effective strategy is resolved

For a given attribute, in order:

1. `RegistrationStrategy` on the attribute, if written.
2. Otherwise `None`, if `ServiceType` is set on the attribute.
3. Otherwise the assembly-wide
   [`RegistrationDefaults.RegistrationStrategy`](/docs/Immediate.Injections/assembly-defaults).
4. Otherwise `None`.

Note step 2: an attribute that sets `ServiceType` never inherits the assembly default. That is
what makes `ServiceType` usable in an assembly whose default is
`SelfAndImplementedInterfaces` without the two fighting.

### `Self`

```csharp title="Self.cs"
using Immediate.Injections.Shared;

[RegisterScoped(RegistrationStrategy = RegistrationStrategy.Self)]
public sealed class UnitOfWork : IUnitOfWork;
```

Emits one registration, `UnitOfWork` → `UnitOfWork`. `IUnitOfWork` is not resolvable. This is
also what a bare `[RegisterScoped]` does.

### `ImplementedInterfaces`

```csharp title="ImplementedInterfaces.cs"
using Immediate.Injections.Shared;

public interface IFirstService;
public interface ISecondService;

[RegisterSingleton(RegistrationStrategy = RegistrationStrategy.ImplementedInterfaces)]
public sealed class InterfacesOnlyService : IFirstService, ISecondService;
```

Emits `IFirstService` → `InterfacesOnlyService` and `ISecondService` →
`InterfacesOnlyService`. `GetService<InterfacesOnlyService>()` returns `null`.

<Callout type="warning" title="Two instances, not one">
Each interface gets its own <code>ServiceDescriptor</code> pointing at the implementation type.
Even under a singleton lifetime, MSDI treats those as two distinct singletons — resolving
<code>IFirstService</code> and <code>ISecondService</code> gives you two different objects. If
you need one shared instance behind several interfaces, use
<code>SelfAndImplementedInterfaces</code> with <code>UseProxyFactory = true</code>; see
<a href="/docs/Immediate.Injections/factories-and-proxies">Factories and proxies</a>.
</Callout>

<Callout type="note" title="IDisposable is excluded — but only here">
<code>ImplementedInterfaces</code> silently skips <code>IDisposable</code> and
<code>IAsyncDisposable</code>, which you almost never want in the container.
<code>SelfAndImplementedInterfaces</code> does <strong>not</strong> apply that filter — a
disposable class registered that way is also registered as <code>IDisposable</code>, and
<code>GetRequiredService&lt;IDisposable&gt;()</code> will resolve it. This asymmetry is current
behavior, not a documented design choice.
</Callout>

"Implemented interfaces" means every interface in the type's transitive interface set,
including ones inherited from base classes and from other interfaces — not only the ones named
in the class declaration.

### `SelfAndImplementedInterfaces`

```csharp title="SelfAndImplementedInterfaces.cs"
using Immediate.Injections.Shared;

public interface ISharedService;

[RegisterSingleton(RegistrationStrategy = RegistrationStrategy.SelfAndImplementedInterfaces)]
public sealed class SharedService : ISharedService;
```

Emits `SharedService` → `SharedService` first, then `ISharedService` → `SharedService`. Still
two descriptors, so still two singleton instances unless you add `UseProxyFactory = true`.

This is the strategy to set as an assembly default if you are migrating from a library whose
default was "register as self and all interfaces" — see
[Migrating from other libraries](/docs/Immediate.Injections/migrating-from-other-libraries).

## The three `DuplicateStrategy` members

`DuplicateStrategy` picks which `ServiceCollectionDescriptorExtensions` method the generated
code calls.

| Member             | Generated call                 | Effect                                                                     |
| ------------------ | ------------------------------ | -------------------------------------------------------------------------- |
| `Append` (default) | `services.Add(descriptor)`     | Adds unconditionally; both registrations survive                           |
| `Skip`             | `services.TryAdd(descriptor)`  | Adds only if no registration for that service type exists                  |
| `Replace`          | `services.Replace(descriptor)` | Removes the **first** existing descriptor for that service type, then adds |

```csharp title="DuplicateStrategy.cs"
using Immediate.Injections.Shared;

public interface IEmailSender;

// Loses to anything already registered
[RegisterSingleton<IEmailSender>(DuplicateStrategy = DuplicateStrategy.Skip)]
public sealed class DefaultEmailSender : IEmailSender;

// Wins over whatever was registered first
[RegisterSingleton<IEmailSender>(DuplicateStrategy = DuplicateStrategy.Replace)]
public sealed class TestEmailSender : IEmailSender;
```

Three things worth knowing:

- **"Already exists" means at the moment `AddXxxServices` runs.** Registrations added to the
  collection after that call are not affected by `Skip` or `Replace`.
- **`Replace` removes only the first match.** If three descriptors already exist for
  `IEmailSender`, two of them survive alongside the new one. It is a swap, not a clear-and-set.
- **Order within the generated method is not something to rely on.** Registrations are grouped by
  tag set and emitted per lifetime and per attribute arity, across several generated files.

The effective value is the attribute's, falling back to the assembly-wide
[`RegistrationDefaults.DuplicateStrategy`](/docs/Immediate.Injections/assembly-defaults), falling
back to `Append`. Writing `DuplicateStrategy = DuplicateStrategy.Append` explicitly does override
an assembly default of `Replace`.

## Where to go next

- [Open generics](/docs/Immediate.Injections/open-generics) — what these strategies do to a
  generic class
- [Factories and proxies](/docs/Immediate.Injections/factories-and-proxies) — sharing one
  instance across several registrations
- [Assembly-wide defaults](/docs/Immediate.Injections/assembly-defaults)
