---
title: Manual registration
description: Hook hand-written registration code into the generated AddXxxServices method with [RegisterServices].
order: 8
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Not every registration fits on an attribute. Options binding, `AddHttpClient`, `AddDbContext`,
third-party extension methods — these are ordinary code. `[RegisterServices]` marks a method to
be called from the generated `AddXxxServices`, so the whole assembly still registers through one
call.

<Callout type="note">
This is a different attribute from the ones on
<a href="/docs/Immediate.Injections/registering-services">Registering services</a>. Those go on
classes and describe a registration; <code>[RegisterServices]</code> goes on a method and runs
your own code.
</Callout>

## Declaring a method

```csharp title="ManualRegistrations.cs"
using Immediate.Injections.Shared;
using Microsoft.Extensions.DependencyInjection;

public static class ManualRegistrations
{
	[RegisterServices]
	public static void Register(IServiceCollection services)
	{
		_ = services.AddHttpClient<TodoApiClient>();
		_ = services.AddDbContext<TodoDbContext>();
	}
}
```

Nothing else is needed. `AddTodoServices()` now calls `ManualRegistrations.Register(services)`
after applying every attribute-driven registration.

## The accepted signatures

Exactly two shapes are accepted:

```csharp
static void Method(IServiceCollection services);
static void Method(IServiceCollection services, ReadOnlySpan<string> tags);
```

Everything else is [INJ0001](/docs/Immediate.Injections/diagnostics#inj0001), an error. In
particular:

| Written                                                        | Accepted                                  |
| -------------------------------------------------------------- | ----------------------------------------- |
| `static void M(IServiceCollection)`                            | Yes                                       |
| `static void M(IServiceCollection, ReadOnlySpan<string>)`      | Yes                                       |
| `static async void M(IServiceCollection)`                      | No — `async` is rejected                  |
| `static IServiceCollection M(IServiceCollection)`              | No — must return `void`                   |
| `static void M()`                                              | No — the collection parameter is required |
| `static void M(IServiceCollection, ReadOnlySpan<string>, int)` | No — no third parameter                   |
| `void M(IServiceCollection)`                                   | No — must be `static`                     |

The parameters are positional: `IServiceCollection` first, `ReadOnlySpan<string>` second. The
containing type is up to you — a `static` method on a non-static class works just as well as one
on a `static` class.

The generated code calls the method by its fully-qualified name from a class in the project's
root namespace, so the method and its containing type must be **accessible from there**. A
`private` or nested-private method passes the analyzer and then fails to compile in the
generated file; `public` or `internal` is what you want.

## Receiving tags

The second parameter receives the exact tag list passed to `AddXxxServices`, so hand-written
registrations can apply the same filter as attribute-driven ones:

```csharp title="ManualRegistrations.cs"
using Immediate.Injections.Shared;
using Microsoft.Extensions.DependencyInjection;

public static class ManualRegistrations
{
	[RegisterServices]
	public static void RegisterWorkers(IServiceCollection services, ReadOnlySpan<string> tags)
	{
		if (tags.Length != 0 && !tags.Contains("worker"))
			return;

		_ = services.AddHostedService<OutboxWorker>();
	}
}
```

Note the guard shape. The generator does no filtering for you here — it hands you the raw list,
including the empty list that means "register everything". Mirroring the built-in rule means
treating an empty span as a match. See [Tags and conditional
registration](/docs/concepts/tags).

## Several methods

Any number of `[RegisterServices]` methods may exist across the assembly, on any number of
types, and **all of them are called** — one after another, in the order the generator collected
them. There is no "one wins" rule and no way to declare an ordering, so do not write two methods
that both register the same service type unless you have set a `DuplicateStrategy` that makes
the outcome deterministic.

```csharp title="Two methods, both called"
public static class ManualRegistrations
{
	[RegisterServices]
	public static void RegisterInfrastructure(IServiceCollection services) { /* … */ }

	[RegisterServices]
	public static void RegisterOptions(IServiceCollection services) { /* … */ }
}
```

The generated hook is a single method that calls each in turn:

```csharp title="II.RegisterServicesMethods.g.cs"
static partial void RegisterServices(this IServiceCollection services, ReadOnlySpan<string> tags)
{
	ManualRegistrations.RegisterInfrastructure(services);
	ManualRegistrations.RegisterOptions(services);
}
```

That call happens **last** inside `AddXxxServices`, after all attribute-driven registrations —
which matters if your manual code uses `TryAdd` or `Replace`.

## Where to go next

- [Tagged registration](/docs/Immediate.Injections/tagged-registration)
- [How it works](/docs/Immediate.Injections/how-it-works)
- [Diagnostics](/docs/Immediate.Injections/diagnostics)
