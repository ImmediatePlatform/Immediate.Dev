---
title: Assembly-wide defaults
description: Set the default registration strategy, duplicate strategy and proxy behavior once for a whole assembly.
order: 9
group: Guides
---

`[assembly: RegistrationDefaults(...)]` sets the fallback values used by every registration
attribute in the assembly, so you write the common case once instead of on every class.

```csharp title="AssemblyInfo.cs"
using Immediate.Injections.Shared;

[assembly: RegistrationDefaults(
	RegistrationStrategy = RegistrationStrategy.SelfAndImplementedInterfaces,
	DuplicateStrategy = DuplicateStrategy.Skip,
	UseProxyFactory = true
)]
```

Put it in `Program.cs`, in an `AssemblyInfo.cs`, or anywhere else in the assembly — assembly
attributes are file-position independent. Only one such attribute is meaningful; the attribute
is not `AllowMultiple`.

## The three properties

| Property               | Falls back to                                         | Applies to                          |
| ---------------------- | ----------------------------------------------------- | ----------------------------------- |
| `RegistrationStrategy` | `RegistrationStrategy.None` (which behaves as `Self`) | The non-generic attribute form only |
| `DuplicateStrategy`    | `DuplicateStrategy.Append`                            | All attribute forms                 |
| `UseProxyFactory`      | `false`                                               | All attribute forms                 |

Only these three exist. There is no assembly-wide default for `ServiceType`, `ServiceKey`,
`Factory`, `Tags` or the lifetime.

## Per-attribute values always win

An attribute that sets a property uses its own value; only unset properties fall back.

```csharp title="Overrides.cs"
using Immediate.Injections.Shared;

[assembly: RegistrationDefaults(
	RegistrationStrategy = RegistrationStrategy.SelfAndImplementedInterfaces,
	DuplicateStrategy = DuplicateStrategy.Replace
)]

public interface IService;

// Self + IService, replacing any existing descriptors — both defaults apply
[RegisterScoped]
public sealed class Service : IService;

// Self only, still replacing — strategy overridden, duplicate default kept
[RegisterScoped(RegistrationStrategy = RegistrationStrategy.Self)]
public sealed class OtherService : IService;

// Self + IService, appending — duplicate overridden back to the built-in default
[RegisterScoped(DuplicateStrategy = DuplicateStrategy.Append)]
public sealed class ThirdService : IService;
```

Writing a value that happens to equal the built-in default still counts as an override: with an
assembly default of `Replace`, `DuplicateStrategy = DuplicateStrategy.Append` on an attribute
does produce `services.Add(...)`.

## Two interactions worth knowing

### `ServiceType` opts out of the strategy default

An attribute that sets `ServiceType` never inherits `RegistrationDefaults.RegistrationStrategy`
— it resolves to `None`, meaning "register as the given service type". That is what lets a
single `ServiceType` registration coexist with an assembly default of
`SelfAndImplementedInterfaces` without the two fighting.

The generic attribute forms are unaffected for the same reason: they carry no
`RegistrationStrategy` property at all, and their service type comes from the type argument.

### An assembly `UseProxyFactory` yields to `Factory`

`UseProxyFactory = true` at the assembly level applies only where the attribute names no
`Factory`. If an attribute sets `Factory`, the assembly-level proxy default is ignored and the
factory is used. Writing `UseProxyFactory = true` on the attribute itself does apply both — see
[Factories and proxies](/docs/Immediate.Injections/factories-and-proxies#combining-factory-with-useproxyfactory).

## A recommended pair

If you want "register everything as itself and as its interfaces, sharing one instance", the
combination is:

```csharp title="AssemblyInfo.cs"
using Immediate.Injections.Shared;

[assembly: RegistrationDefaults(
	RegistrationStrategy = RegistrationStrategy.SelfAndImplementedInterfaces,
	UseProxyFactory = true
)]
```

Every bare `[RegisterScoped]` in the assembly then registers the concrete type for real and
forwards each interface to it, so all of them resolve the same object. This is also the
recommended setting when migrating from Injectio — see
[Migrating from other libraries](/docs/Immediate.Injections/migrating-from-other-libraries).

## Where to go next

- [Registration strategies](/docs/Immediate.Injections/registration-strategies)
- [Factories and proxies](/docs/Immediate.Injections/factories-and-proxies)
- [Attributes reference](/docs/Immediate.Injections/attributes-reference)
