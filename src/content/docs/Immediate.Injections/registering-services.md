---
title: Registering services
description: Mark a class with a lifetime attribute and call the generated AddXxxServices extension.
order: 2
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Registration has two halves: an attribute on the class, and one call to the generated extension
method at startup. Everything else on this page is a variation on those two.

## The three lifetime attributes

`RegisterSingleton`, `RegisterScoped` and `RegisterTransient` all live in
`Immediate.Injections.Shared` and all carry the same properties. They differ only in the
`ServiceDescriptor` lifetime they emit.

```csharp title="Services.cs"
using Immediate.Injections.Shared;

[RegisterSingleton]
public sealed class Clock;

[RegisterScoped]
public sealed class UnitOfWork;

[RegisterTransient]
public sealed class EmailSender;
```

With no other properties set, each class is registered **as itself**. `Clock` resolves through
`GetRequiredService<Clock>()`, not through any interface it happens to implement.

The attributes target classes, and records count — the generator accepts both class and record
declarations.

## The three forms

Each lifetime attribute exists in three arities. They are not interchangeable; each answers a
different question.

| Form                                          | Answers                                                                | Extra properties                      |
| --------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------- |
| `[RegisterScoped]`                            | "register this class, however the strategy says"                       | `ServiceType`, `RegistrationStrategy` |
| `[RegisterScoped<TService>]`                  | "register this class as `TService`"                                    | —                                     |
| `[RegisterScoped<TService, TImplementation>]` | "register this _closed construction_ of a generic class as `TService`" | —                                     |

<Callout type="note">
The generic forms deliberately do <strong>not</strong> expose <code>ServiceType</code> or
<code>RegistrationStrategy</code> — the type arguments already say what the service type is.
Both generic forms do expose <code>ServiceKey</code>, <code>Factory</code>,
<code>DuplicateStrategy</code>, <code>UseProxyFactory</code> and <code>Tags</code>.
</Callout>

### Non-generic

The most flexible form. Use `ServiceType` for a single service type, or `RegistrationStrategy`
to register against a set of types. The two are mutually exclusive
([INJ0003](/docs/Immediate.Injections/diagnostics#inj0003)).

```csharp title="NonGeneric.cs"
using Immediate.Injections.Shared;

public interface IClock;

[RegisterSingleton(ServiceType = typeof(IClock))]
public sealed class SystemClock : IClock;

public interface IUnitOfWork;

[RegisterScoped(RegistrationStrategy = RegistrationStrategy.SelfAndImplementedInterfaces)]
public sealed class UnitOfWork : IUnitOfWork;
```

### One type argument

The everyday form for "this class implements this interface".

```csharp title="OneArgument.cs"
using Immediate.Injections.Shared;

public interface ITodoRepository;

[RegisterScoped<ITodoRepository>]
public sealed class TodoRepository : ITodoRepository;
```

Only `ITodoRepository` is registered. `TodoRepository` itself is not resolvable — for that, use
`RegistrationStrategy.SelfAndImplementedInterfaces` instead. The class must be assignable to the
type argument, or you get [INJ0004](/docs/Immediate.Injections/diagnostics#inj0004).

### Two type arguments

This form exists for one job: registering a **specific closed construction** of a generic class.
`TImplementation` must be a construction of the attributed class itself.

```csharp title="TwoArguments.cs"
using Immediate.Injections.Shared;

public interface IRepository<T>;

[RegisterScoped<IRepository<Todo>, Repository<Todo>>]
[RegisterScoped<IRepository<User>, Repository<User>>]
public sealed class Repository<T> : IRepository<T>;
```

That emits two registrations, one per attribute:

```csharp title="Generated output"
ServiceDescriptor.Scoped(typeof(IRepository<Todo>), typeof(Repository<Todo>));
ServiceDescriptor.Scoped(typeof(IRepository<User>), typeof(Repository<User>));
```

Two rules the analyzer enforces:

- On a **non-generic** class the form is redundant — `[RegisterScoped<IFoo, Foo>]` on `Foo` says
  nothing that `[RegisterScoped<IFoo>]` does not. That is
  [INJ0005](/docs/Immediate.Injections/diagnostics#inj0005), an info-level suggestion; the
  registration is still emitted.
- If `TImplementation` is not a construction of the attributed class, it is
  [INJ0006](/docs/Immediate.Injections/diagnostics#inj0006), an error, and nothing is emitted.

If you want the _open_ generic registered instead — `IRepository<>` closed on demand by the
container — see [Open generics](/docs/Immediate.Injections/open-generics).

## Several attributes on one class

All three attributes are declared `AllowMultiple = true`, so a class can carry as many as it
needs, of the same lifetime or of different ones.

```csharp title="MultipleAttributes.cs"
using Immediate.Injections.Shared;

public interface ICache;

[RegisterSingleton<ICache>]
[RegisterSingleton<ICache>(ServiceKey = "fallback")]
public sealed class MemoryCache : ICache;
```

Each attribute produces its own independent registration. A common pairing is one plain
registration plus one keyed registration of the same class, so it is reachable both ways.

## Calling the generated method

Add one call in `Program.cs`:

```csharp title="Program.cs"
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddTodoServices();

var app = builder.Build();
```

`Xxx` in `AddXxxServices` is the assembly identifier — by default the assembly name with `.` and
spaces removed:

| Assembly name     | Generated method              |
| ----------------- | ----------------------------- |
| `Todo`            | `AddTodoServices()`           |
| `Todo.Web`        | `AddTodoWebServices()`        |
| `Application.Web` | `AddApplicationWebServices()` |

The method returns the `IServiceCollection`, so it chains. It also accepts a `params` list of
tags — see [Tagged registration](/docs/Immediate.Injections/tagged-registration).

## Where to go next

- [Registration strategies](/docs/Immediate.Injections/registration-strategies) — registering
  against interfaces, and duplicate handling
- [Keyed services](/docs/Immediate.Injections/keyed-services)
- [Attributes reference](/docs/Immediate.Injections/attributes-reference) — every property in
  one table
