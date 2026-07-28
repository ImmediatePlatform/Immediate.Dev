---
title: Caching a query
description: Cache a handler's responses with [CacheFor], and invalidate them from the write handler.
order: 8
group: Tutorial
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Cache wraps a whole handler — pipeline included — in an `IMemoryCache`-backed cache
class. A cache hit skips the handler and every behavior attached to it.

## Create the cache

```csharp title="Features/GetTodoQueryCache.cs"
using Immediate.Cache.Shared;

namespace Todo.Features;

[CacheFor<GetTodoQuery>]
public sealed partial class GetTodoQueryCache
{
	protected override string TransformKey(GetTodoQuery.Query request) =>
		$"GetTodo({request.Id})";
}
```

That's the whole cache. The generator emits the base class
`ApplicationCache<GetTodoQuery.Query, TodoItem?>` and a constructor taking `IMemoryCache` and an
owned handler.

Note also that the cache class itself must be `partial` (the generator adds the base class and
constructor to it) and must not be nested (`IC0001`).

## Read through the cache

Consumers call the cache, not the handler. That means the HTTP endpoint moves off `GetTodoQuery`
and onto a thin handler that reads through the cache:

```csharp title="Features/GetTodoQuery.cs" {2}
[Handler]
// [MapGet("/api/todos/{id:int}")]  ← remove this; the endpoint moves below
public sealed partial class GetTodoQuery(TodoRepository repository)
{
	public sealed record Query
	{
		public required int Id { get; init; }
	}

	private ValueTask<TodoItem?> HandleAsync(
		Query query,
		CancellationToken token
	) => ValueTask.FromResult(repository.GetById(query.Id));
}
```

```csharp title="Features/GetTodo.cs"
using Immediate.Apis.Shared;
using Immediate.Handlers.Shared;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Todo.Features;

[Handler]
[MapGet("/api/todos/{id:int}")]
public sealed partial class GetTodo(GetTodoQueryCache cache)
{
	public sealed record Query
	{
		public required int Id { get; init; }
	}

	internal static Results<Ok<TodoItem>, NotFound> TransformResult(TodoItem? result) =>
		result is null
			? TypedResults.NotFound()
			: TypedResults.Ok(result);

	private ValueTask<TodoItem?> HandleAsync(
		Query query,
		CancellationToken token
	) => cache.GetValue(new GetTodoQuery.Query { Id = query.Id }, token);
}
```

<Callout type="note" title="Why the extra class">
Immediate.Cache wraps the handler rather than sitting inside its pipeline, so there is no way for
a handler to cache <em>itself</em> — it would recurse. The cached handler and the thing that
reads through the cache are always two different types. In exchange, a cache hit costs nothing:
no behaviors run, no DI scope is created.
</Callout>

## Invalidate on write

Completing a todo makes the cached entry stale. Inject the cache into the write handler and drop
the entry:

```csharp title="Features/CompleteTodoCommand.cs" {3,17}
[Handler]
[MapPut("/api/todos/{id:int}/complete")]
public sealed partial class CompleteTodoCommand(
	TodoRepository repository,
	GetTodoQueryCache cache
)
{
	public sealed record Command
	{
		public required int Id { get; init; }
	}

	internal static Results<Ok<TodoItem>, NotFound> TransformResult(TodoItem? result) =>
		result is null ? TypedResults.NotFound() : TypedResults.Ok(result);

	private ValueTask<TodoItem?> HandleAsync(
		[AsParameters] Command command,
		CancellationToken token
	)
	{
		var updated = repository.Complete(command.Id);
		cache.RemoveValue(new GetTodoQuery.Query { Id = command.Id });
		return ValueTask.FromResult(updated);
	}
}
```

`RemoveValue` and `SetValue` are synchronous and return `void`. Only `GetValue` is awaitable.

If you already have the new value in hand, `SetValue` writes it without ever running the handler:

```csharp
cache.SetValue(new GetTodoQuery.Query { Id = command.Id }, updated);
```

## Register it

Immediate.Cache needs `IMemoryCache`, so two calls rather than one:

```csharp title="Program.cs" {6-7}
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<TodoRepository>();
builder.Services.AddTodoBehaviors();
builder.Services.AddTodoHandlers();
builder.Services.AddMemoryCache();
builder.Services.AddTodoCaches();
```

Forgetting `AddMemoryCache()` is a runtime DI failure, not a build error — it's the most common
first-run mistake with this package.

## Run it

```bash title="terminal"
dotnet run
```

```bash title="terminal"
curl http://localhost:5000/api/todos/1   # runs the handler
curl http://localhost:5000/api/todos/1   # served from cache
curl -X PUT http://localhost:5000/api/todos/1/complete
curl http://localhost:5000/api/todos/1   # runs the handler again
```

Entries expire on a **5-minute sliding expiration** by default. Override
`GetCacheEntryOptions()` to change that, or to set size, priority or eviction callbacks — see
[Configuring cache entries](/docs/Immediate.Cache/cache-entry-options).

<Callout type="warning" title="In-memory only">
The only backing store is <code>IMemoryCache</code>. There is no
<code>IDistributedCache</code> or <code>HybridCache</code> support, so in a multi-instance
deployment each instance holds its own cache and invalidation does not propagate between them.
</Callout>

## What you have

A read path that runs the handler once per key and coalesces concurrent callers onto that single
execution, with explicit invalidation from the write path.

## Up next

[Wiring up dependency injection](/docs/getting-started/tutorial/dependency-injection) —
`TodoRepository` stops being registered by hand.
