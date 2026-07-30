---
title: Your first handler
description: Write a [Handler] class, register it, and call the generated Handler type from an entry point.
order: 5
group: Tutorial
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

A handler is one partial class marked `[Handler]`, containing a request type, a response type,
and exactly one method named `Handle` or `HandleAsync`. Immediate.Handlers generates the pipeline
class, the DI registration and the plumbing to connect them.

## The storage this tutorial uses

Start with a plain in-memory repository. It becomes a properly registered service in
[Wiring up dependency injection](/docs/getting-started/tutorial/dependency-injection); for now
it's an ordinary class.

```csharp title="TodoRepository.cs"
using System.Collections.Concurrent;

namespace Todo;

public sealed record TodoItem(int Id, string Title, bool IsComplete);

public sealed class TodoRepository
{
	private readonly object _gate = new();
	private readonly ConcurrentDictionary<int, SemaphoreSlim> _operationLocks = new();

	private readonly List<TodoItem> _items =
	[
		new(1, "Read the tutorial", IsComplete: false),
		new(2, "Write a handler", IsComplete: false),
	];

	private int _nextId = 3;

	public SemaphoreSlim GetOperationLock(int id) =>
		_operationLocks.GetOrAdd(id, static _ => new(1, 1));

	public IReadOnlyList<TodoItem> GetAll()
	{
		lock (_gate)
			return [.. _items];
	}

	public TodoItem? GetById(int id)
	{
		lock (_gate)
			return _items.Find(t => t.Id == id);
	}

	public TodoItem Add(string title)
	{
		lock (_gate)
		{
			var item = new TodoItem(_nextId++, title, IsComplete: false);
			_items.Add(item);
			return item;
		}
	}

	public TodoItem? Complete(int id)
	{
		lock (_gate)
		{
			var index = _items.FindIndex(t => t.Id == id);
			if (index < 0)
				return null;

			var updated = _items[index] with { IsComplete = true };
			_items[index] = updated;
			return updated;
		}
	}
}
```

## Your first handler

```csharp title="Features/GetTodosQuery.cs"
using Immediate.Handlers.Shared;

namespace Todo.Features;

[Handler]
public sealed partial class GetTodosQuery(TodoRepository repository)
{
	public sealed record Query;

	public sealed record Response(IReadOnlyList<TodoItem> Items);

	private ValueTask<Response> HandleAsync(
		Query query,
		CancellationToken token
	) => ValueTask.FromResult(new Response(repository.GetAll()));
}
```

Four things are load-bearing here:

- **`partial`** — the generator adds members to this class. Without it, nothing compiles.
- **The handle method is `private`.** It is called only by generated code. Making it anything
  else is an error (`IHR0011`).
- **It returns `ValueTask<T>`.** `Task<T>` is explicitly rejected (`IHR0002`). A bare `ValueTask`
  is fine for commands.
- **The `CancellationToken` is optional but trailing.** Omitting it produces a warning
  (`IHR0012`), not an error.

The nested `Query` and `Response` names are convention, not a rule. No base type or interface is
required, and any of `record`, `class`, `sealed class` or `struct` works.

<Callout type="note" title="Static or sealed?">
This tutorial uses <code>sealed partial class</code> with a primary constructor, so dependencies
arrive as constructor parameters. The alternative is <code>static partial class</code>, where the
handle method is <code>static</code> and takes its dependencies as extra parameters. Both are
fully supported and the generated pipeline is nearly identical. Sealed is used here because
Immediate.Cache requires a non-static handler, which you'll hit two pages from now. See
<a href="/docs/Immediate.Handlers/handler-dependencies">Handler dependencies</a> for the full
comparison.
</Callout>

## Register and call it

```csharp title="Program.cs"
using Todo;
using Todo.Features;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<TodoRepository>();
builder.Services.AddTodoHandlers();

var app = builder.Build();

app.MapGet("/", async (GetTodosQuery.Handler handler, CancellationToken token) =>
{
	var response = await handler.HandleAsync(new GetTodosQuery.Query(), token);
	return response.Items;
});

app.Run();
```

`AddTodoHandlers()` is generated from your assembly name. It registers every `[Handler]` class in
the assembly, as `Scoped` by default.

What you inject is `GetTodosQuery.Handler` — the generated nested class, not `GetTodosQuery`
itself. Injecting the container class directly bypasses the behavior pipeline, and the analyzer
warns about it (`IHR0022`).

<Callout type="tip">
If the calling code can't reference the handler's type directly, the generated
<code>Handler</code> also implements
<code>IHandler&lt;GetTodosQuery.Query, GetTodosQuery.Response&gt;</code>, which is registered too.
</Callout>

## Run it

```bash title="terminal"
dotnet run
```

```bash title="terminal"
curl http://localhost:5000/
# [{"id":1,"title":"Read the tutorial","isComplete":false}, …]
```

## What you have

A handler resolved from DI, running behind a generated pipeline, with no reflection anywhere.
Open `obj/generated/` if you enabled `EmitCompilerGeneratedFiles` and you'll find
`IH.Todo.Features.GetTodosQuery.g.cs` containing exactly what got registered.

## Up next

[Adding validation](/docs/getting-started/tutorial/adding-validation) — a `CreateTodoCommand`
that rejects an empty title before your handler method is ever called.
