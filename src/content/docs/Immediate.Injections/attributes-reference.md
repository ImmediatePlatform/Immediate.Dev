---
title: Attributes reference
description: Every attribute, property and enum member in Immediate.Injections, with defaults and constraints.
order: 11
group: Reference
---

Everything in this package lives in the `Immediate.Injections.Shared` namespace.

| Type                                                                                  | Target   | Multiple? |
| ------------------------------------------------------------------------------------- | -------- | --------- |
| `RegisterSingletonAttribute`, `RegisterScopedAttribute`, `RegisterTransientAttribute` | Class    | Yes       |
| `RegisterSingletonAttribute<TService>` and the scoped/transient equivalents           | Class    | Yes       |
| `RegisterSingletonAttribute<TService, TImplementation>` and equivalents               | Class    | Yes       |
| `RegistrationDefaultsAttribute`                                                       | Assembly | No        |
| `RegisterServicesAttribute`                                                           | Method   | No        |
| `RegistrationStrategy` (enum)                                                         | —        | —         |
| `DuplicateStrategy` (enum)                                                            | —        | —         |

## Lifetime attributes

The three lifetimes — `RegisterSingleton`, `RegisterScoped`, `RegisterTransient` — are three
copies of the same surface. They differ only in the `ServiceDescriptor` lifetime emitted.

### Properties by form

| Property               | Type                   | Non-generic | `<TService>` | `<TService, TImplementation>` |
| ---------------------- | ---------------------- | ----------- | ------------ | ----------------------------- |
| `ServiceType`          | `Type?`                | Yes         | —            | —                             |
| `RegistrationStrategy` | `RegistrationStrategy` | Yes         | —            | —                             |
| `ServiceKey`           | `object?`              | Yes         | Yes          | Yes                           |
| `Factory`              | `string?`              | Yes         | Yes          | Yes                           |
| `DuplicateStrategy`    | `DuplicateStrategy`    | Yes         | Yes          | Yes                           |
| `UseProxyFactory`      | `bool`                 | Yes         | Yes          | Yes                           |
| `Tags`                 | `string[]?`            | Yes         | Yes          | Yes                           |

All properties are `init`-only and set as named arguments; none of the attributes has a
positional constructor.

### `ServiceType`

The `ServiceDescriptor.ServiceType` for the registration. The attributed class must be
assignable to it, or [INJ0004](/docs/Immediate.Injections/diagnostics#inj0004). Mutually
exclusive with `RegistrationStrategy` ([INJ0003](/docs/Immediate.Injections/diagnostics#inj0003)).

```csharp
[RegisterSingleton(ServiceType = typeof(IClock))]
public sealed class SystemClock : IClock;
```

Accepts an unbound generic — `typeof(IRepository<>)` — which is the only way to register an open
generic. See [Open generics](/docs/Immediate.Injections/open-generics).

Setting `ServiceType` means the attribute does **not** inherit
`RegistrationDefaults.RegistrationStrategy`; the effective strategy becomes `None`.

### `RegistrationStrategy`

Which service types the class is registered as. See
[Registration strategies](/docs/Immediate.Injections/registration-strategies) for the full
behavior of each member.

Resolution order: the attribute's value; else `None` if `ServiceType` is set; else
`RegistrationDefaults.RegistrationStrategy`; else `None`.

### `ServiceKey`

Makes the registration keyed — the emitted descriptor becomes `KeyedSingleton`, `KeyedScoped` or
`KeyedTransient`. Any compile-time constant that C# accepts as an attribute argument works
(string, enum member, integer). Writing `ServiceKey = null` explicitly produces an _unkeyed_
registration.

```csharp
[RegisterSingleton<INotificationSender>(ServiceKey = "email")]
public sealed class EmailNotificationSender : INotificationSender;
```

See [Keyed services](/docs/Immediate.Injections/keyed-services).

### `Factory`

The name of a static method on the attributed class used as the implementation factory.

| Registration | Required signature                              |
| ------------ | ----------------------------------------------- |
| Unkeyed      | `static TSelf Method(IServiceProvider)`         |
| Keyed        | `static TSelf Method(IServiceProvider, object)` |

The method must exist ([INJ0009](/docs/Immediate.Injections/diagnostics#inj0009)) with a matching
signature ([INJ0010](/docs/Immediate.Injections/diagnostics#inj0010)). Not supported on a generic
target class ([INJ0012](/docs/Immediate.Injections/diagnostics#inj0012) when the service type is
an unbound generic; silently dropped otherwise).

```csharp
[RegisterSingleton(Factory = nameof(Create))]
public sealed class MyService
{
	public static MyService Create(IServiceProvider provider) => new();
}
```

### `DuplicateStrategy`

Which `IServiceCollection` method the registration is added with. Resolution order: the
attribute's value; else `RegistrationDefaults.DuplicateStrategy`; else `Append`.

### `UseProxyFactory`

When `true`, the registration's implementation factory becomes
`ServiceProviderServiceExtensions.GetRequiredService<TImplementation>` — or
`ServiceProviderKeyedServiceExtensions.GetRequiredKeyedService<TImplementation>` for a keyed
registration — instead of the implementation type.

**A proxy registration does not register the implementation type**; it must be paired with
something that does.

Cannot proxy to self ([INJ0007](/docs/Immediate.Injections/diagnostics#inj0007)). Cannot be
combined with `Factory` ([INJ0011](/docs/Immediate.Injections/diagnostics#inj0011)) _except_
when the effective strategy is `SelfAndImplementedInterfaces`. Not supported on a generic target
class ([INJ0008](/docs/Immediate.Injections/diagnostics#inj0008) when the service type is an
unbound generic; silently dropped otherwise).

Resolution order: the attribute's value; else `RegistrationDefaults.UseProxyFactory`, but only
when the attribute names no `Factory`; else `false`.

See [Factories and proxies](/docs/Immediate.Injections/factories-and-proxies).

### `Tags`

Tags for this registration, filtered by the arguments passed to `AddXxxServices`. Untagged
registrations are always applied; calling with no tags applies everything. See
[Tagged registration](/docs/Immediate.Injections/tagged-registration).

```csharp
[RegisterSingleton(Tags = ["worker", "background"])]
public sealed class BackgroundWorker;
```

### Generic forms

`RegisterXxx<TService>` registers the attributed class as `TService`.

`RegisterXxx<TService, TImplementation>` registers `TService` against a specific closed
construction of the attributed class; `TImplementation` must be a construction of that class
([INJ0006](/docs/Immediate.Injections/diagnostics#inj0006)) and the form is redundant on a
non-generic class ([INJ0005](/docs/Immediate.Injections/diagnostics#inj0005)).

Neither generic form exposes `ServiceType` or `RegistrationStrategy` — the type arguments already
supply that information.

## `RegistrationDefaultsAttribute`

Assembly-level defaults. Not `AllowMultiple`.

| Property               | Type                   | Default  | Notes                                                                   |
| ---------------------- | ---------------------- | -------- | ----------------------------------------------------------------------- |
| `RegistrationStrategy` | `RegistrationStrategy` | `None`   | Ignored by attributes that set `ServiceType`, and by both generic forms |
| `DuplicateStrategy`    | `DuplicateStrategy`    | `Append` | Applies to all forms                                                    |
| `UseProxyFactory`      | `bool`                 | `false`  | Ignored when the attribute names a `Factory`                            |

```csharp title="AssemblyInfo.cs"
[assembly: RegistrationDefaults(
	RegistrationStrategy = RegistrationStrategy.SelfAndImplementedInterfaces,
	UseProxyFactory = true
)]
```

See [Assembly-wide defaults](/docs/Immediate.Injections/assembly-defaults).

## `RegisterServicesAttribute`

Marks a static method to be invoked from the generated `AddXxxServices`. No properties. Accepted
signatures:

```csharp
static void Method(IServiceCollection services);
static void Method(IServiceCollection services, ReadOnlySpan<string> tags);
```

Anything else is [INJ0001](/docs/Immediate.Injections/diagnostics#inj0001). All such methods in
the assembly are invoked. See
[Manual registration](/docs/Immediate.Injections/manual-registration).

## `RegistrationStrategy`

| Member                         | Value | Registers as                                                                                          |
| ------------------------------ | ----- | ----------------------------------------------------------------------------------------------------- |
| `None`                         | 0     | The `ServiceType` if set, otherwise identical to `Self`. Sentinel — do not set explicitly             |
| `Self`                         | 1     | The attributed class                                                                                  |
| `ImplementedInterfaces`        | 2     | Every implemented interface, **excluding** `IDisposable` and `IAsyncDisposable`; not the class itself |
| `SelfAndImplementedInterfaces` | 3     | The class **and** every implemented interface, with no `IDisposable` exclusion                        |

On a generic class, `ImplementedInterfaces` and `SelfAndImplementedInterfaces` include only
interfaces whose arity matches the class's and whose type arguments are the class's own type
parameters.

## `DuplicateStrategy`

| Member    | Value | Generated call                                  | Effect                                                                    |
| --------- | ----- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `Append`  | 0     | `ServiceCollectionDescriptorExtensions.Add`     | Adds unconditionally                                                      |
| `Skip`    | 1     | `ServiceCollectionDescriptorExtensions.TryAdd`  | Adds only if the service type is not already registered                   |
| `Replace` | 2     | `ServiceCollectionDescriptorExtensions.Replace` | Removes the **first** existing descriptor for the service type, then adds |

## Generated API

`AddXxxServices` is the only public member the generator emits.

```csharp
public static IServiceCollection AddXxxServices(
	this IServiceCollection services,
	params ReadOnlySpan<string> tags   // params string[] on C# 12 and below
);
```

It is declared on a `public static partial class RegistrationServiceCollectionExtensions` in the
project's root namespace, carrying
`[GeneratedCode("Immediate.Injections", "<version>")]`. See
[How it works](/docs/Immediate.Injections/how-it-works).
