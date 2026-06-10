---
title: Attributes
description: Reference for `RegisterSingleton`, `RegisterScoped`, `RegisterTransient` and `RegistrationDefaults`.
---

# {$frontmatter.title}

Immediate.Injections provides attributes to mark classes for registration and options to control how they are registered.

## Registration Attributes

- `RegisterSingleton`: registers the type as a singleton.
- `RegisterScoped`: registers the type as scoped.
- `RegisterTransient`: registers the type as transient.


### `ServiceType`

Registers the class as the specified service type. The class must be assignable to it.

```cs |copy|title=ServiceType.cs
[RegisterSingleton(ServiceType = typeof(IMyService))]
public class MyService : IMyService { }
```

Alternatively, a concrete registration may be declared using generic attributes.

```cs |copy|title=GenericAttribute.cs
[RegisterSingleton<IMyService>]
public class MyService : IMyService { }

[RegisterScoped<IService<string>>]
public class MyService<T> : IMyService<string>
```


### `RegistrationStrategy`

Controls which service types are generated. Mutually exclusive with `ServiceType`.

| Value | Effect |
|---|---|
| `None` (default) | Registers as `ServiceType` if provided, otherwise as the class itself |
| `Self` | Registers as the concrete class |
| `ImplementedInterfaces` | Registers as each interface the class implements |
| `SelfAndImplementedInterfaces` | Registers as the concrete class and each interface |

```csharp |copy|title=RegistrationStrategy.cs
[RegisterSingleton(RegistrationStrategy = RegistrationStrategy.ImplementedInterfaces)]
public class MyService : IMyService { }
```

### `DuplicateStrategy`

Controls what happens when a registration for the same service type already exists.

| Value | Generated call |
|---|---|
| `Append` (default) | `services.Add(...)` |
| `Skip` | `services.TryAdd(...)` |
| `Replace` | `services.Replace(...)` |

```csharp |copy|title=DuplicateStrategy.cs
[RegisterSingleton(DuplicateStrategy = DuplicateStrategy.Append)]
public class MyService : IMyService { }
```

### `ServiceKey`

Registers the service as a keyed service.

```csharp |copy|title=ServiceKey.cs
[RegisterSingleton(ServiceKey = "my-key")]
public class MyService { }
```

### `Factory`

Name of a static factory method on the class to use as `ImplementationFactory`. The method must be `static`, return the
class type, and accept `(IServiceProvider)` for non-keyed or `(IServiceProvider, object)` for keyed registrations.
Cannot be combined with `UseProxyFactory` or used on open generic types. Factories cannot be used with generic target
classes.

```csharp |copy|title=Factory.cs
[RegisterSingleton(Factory = nameof(Create))]
public class MyService
{
    public static MyService Create(IServiceProvider sp) => new MyService();
}
```

### `UseProxyFactory`

When `true`, the registration uses `ServiceProviderServiceExtensions.GetRequiredService<T>` (or the keyed equivalent) as
the factory. This produces a proxy registration — it does not register the implementation itself, but resolves it from
the container.

`UseProxyFactory = true` be combined with the following:
* A provided `Factory`,
* `RegistrationStrategy = Self`, or
* Generic target classes

```csharp |copy|title=UseProxyFactory.cs
[RegisterSingleton(ServiceType = typeof(IMyService), UseProxyFactory = true)]
public class MyService : IMyService { }
```

### `Tags`

Assigns string tags to the registration. When `AddXxxServices` is called with tag arguments, only registrations that share at least one tag (or registrations with no tags) are included.

```csharp |copy|title=TaggedService.cs
[RegisterSingleton(Tags = ["worker", "background"])]
public class BackgroundWorker { }
```
