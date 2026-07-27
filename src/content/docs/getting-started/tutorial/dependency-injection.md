---
title: Wiring up dependency injection
description: Replace hand-written service registrations with [RegisterSingleton] and AddTodoServices().
order: 9
group: Tutorial
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

`TodoRepository` has been registered by hand since the first page. Immediate.Injections moves
that registration next to the class it registers, so adding a service never means remembering to
edit `Program.cs`.

Unlike the other packages, this one has nothing to do with handlers — it registers any class.

## Register the repository

```csharp title="TodoRepository.cs" {5}
using Immediate.Injections.Shared;

namespace Todo;

[RegisterSingleton]
public sealed class TodoRepository
{
	// … unchanged …
}
```

Then replace the hand-written line with the generated method:

```csharp title="Program.cs" {3}
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddTodoServices();
builder.Services.AddTodoBehaviors();
builder.Services.AddTodoHandlers();
builder.Services.AddMemoryCache();
builder.Services.AddTodoCaches();
```

`AddTodoServices()` registers every class in the assembly carrying a registration attribute.
`TodoRepository` is a singleton here because the tutorial's in-memory list has to survive between
requests; a real repository over a `DbContext` would be `[RegisterScoped]`.

There are three lifetime attributes — `[RegisterSingleton]`, `[RegisterScoped]` and
`[RegisterTransient]` — and each has three forms:

```csharp
[RegisterScoped]                                    // registers TodoRepository as itself
[RegisterScoped<ITodoRepository>]                   // as ITodoRepository
[RegisterScoped<ITodoRepository, TodoRepository>]   // service → implementation
```

## Registering behind an interface

Extract an interface and register the class as its implementation:

```csharp title="TodoRepository.cs"
using Immediate.Injections.Shared;

namespace Todo;

public interface ITodoRepository
{
	IReadOnlyList<TodoItem> GetAll();
	TodoItem? GetById(int id);
	TodoItem Add(string title);
	TodoItem? Complete(int id);
}

[RegisterSingleton<ITodoRepository>]
public sealed class TodoRepository : ITodoRepository
{
	// … unchanged …
}
```

Handlers then depend on `ITodoRepository`:

```csharp title="Features/GetTodosQuery.cs" {2}
[Handler]
public sealed partial class GetTodosQuery(ITodoRepository repository)
{
	// … unchanged …
}
```

<Callout type="note" title="Self, interfaces, or both">
<code>[RegisterSingleton&lt;ITodoRepository&gt;]</code> registers the interface only —
resolving <code>TodoRepository</code> directly will now fail. If you want both, use
<code>RegistrationStrategy.SelfAndImplementedInterfaces</code>, which registers the concrete type
and each of its interfaces. Note that resolving through two registrations gives you two
instances unless you also set <code>UseProxyFactory</code>; see
<a href="/docs/Immediate.Injections/registration-strategies">Registration strategies</a> and
<a href="/docs/Immediate.Injections/factories-and-proxies">Factories and proxies</a>.
</Callout>

## What else it does

Beyond the lifetime attributes, the package covers most of what people reach for a container
extension to do:

| Need                                          | Where                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| Resolve by key                                | [Keyed services](/docs/Immediate.Injections/keyed-services)               |
| `IRepository<>` → `Repository<>`              | [Open generics](/docs/Immediate.Injections/open-generics)                 |
| Construct via a static method                 | [Factories and proxies](/docs/Immediate.Injections/factories-and-proxies) |
| Register only in some hosts                   | [Tagged registration](/docs/Immediate.Injections/tagged-registration)     |
| Registration that needs real code             | [Manual registration](/docs/Immediate.Injections/manual-registration)     |
| Set a default strategy for the whole assembly | [Assembly-wide defaults](/docs/Immediate.Injections/assembly-defaults)    |

<Callout type="warning" title="If you use Immediate.Injections on its own">
Immediate.Injections doesn't require Immediate.Handlers — but
<code>[assembly: ImmediateAssemblyIdentifier]</code>, which renames
<code>AddTodoServices()</code>, is defined in the Immediate.Handlers package. In an
Injections-only project it either won't compile or, if you declare a similarly named type in the
wrong namespace, will be ignored with no diagnostic. See
<a href="/docs/concepts/assembly-identifier">The assembly identifier</a>. This tutorial
references Immediate.Handlers anyway, so it doesn't apply here.
</Callout>

## Run it

```bash title="terminal"
dotnet run
curl http://localhost:5000/api/todos
```

Everything behaves exactly as before — the only change is where the registration lives.

## What you have

A complete Todo API where every registration is generated: handlers, behaviors, caches, endpoints
and services. `Program.cs` is five `Add` calls and one `Map` call, and none of them will drift out
of sync with the code they register.

## Up next

[Where to go next](/docs/getting-started/tutorial/next-steps).
