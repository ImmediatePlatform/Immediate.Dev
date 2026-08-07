---
title: Exposing an HTTP endpoint
description: Turn handlers into minimal-API endpoints with the verb attributes, TransformResult and ProblemDetails.
order: 7
group: Tutorial
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Apis maps a handler onto a minimal-API endpoint. You add a verb attribute; it generates
the `MapGet` call, the model binding and the DI resolution. The hand-written `app.MapGet(...)`
calls from the previous two pages go away.

## Map the existing handlers

```csharp title="Features/GetTodosQuery.cs" {6}
using Immediate.Apis.Shared;
using Immediate.Handlers.Shared;

namespace Todo.Features;

[Handler]
[MapGet("/api/todos")]
public sealed partial class GetTodosQuery(TodoRepository repository)
{
	// … unchanged …
}
```

```csharp title="Features/CreateTodoCommand.cs" {2}
[Handler]
[MapPost("/api/todos")]
public sealed partial class CreateTodoCommand(TodoRepository repository)
{
	// … unchanged …
}
```

Then replace the hand-written routes in `Program.cs` with one call:

```csharp title="Program.cs" {8}
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<TodoRepository>();
builder.Services.AddTodoHandlers();

var app = builder.Build();

app.MapTodoEndpoints();

app.Run();
```

`MapTodoEndpoints()` maps every mapped handler in the assembly. It optionally takes a route
prefix and a list of [tags](/docs/concepts/tags).

## How the request gets bound

You didn't write any binding attributes, and you don't need to — Immediate.Apis infers them:

- `GET /api/todos` has no body, so the `Query` is bound with `[AsParameters]`.
- `POST /api/todos` gets `[FromBody]`, because POST, PUT and PATCH default to body binding.

The full inference order, including the `IFormFile` and per-property `[FromXxx]` cases, is on
[Binding request data](/docs/Immediate.Apis/binding-request-data). You can always override it by
putting an explicit attribute on the request parameter.

## Attributes from `HandleAsync`

Attributes applied to `HandleAsync` are copied to the generated endpoint handler. This lets
ASP.NET Core metadata attributes stay next to the method they describe:

```csharp
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

[ProducesResponseType<IReadOnlyList<TodoItem>>(StatusCodes.Status200OK)]
private ValueTask<IReadOnlyList<TodoItem>> HandleAsync(
	Query query,
	CancellationToken token
) => ValueTask.FromResult(repository.GetAll());
```

The generated route handler carries the attribute, so it is available to OpenAPI and other ASP.NET
Core conventions.

## An endpoint with a route parameter

```csharp title="Features/GetTodoQuery.cs"
using Immediate.Apis.Shared;
using Immediate.Handlers.Shared;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Todo.Features;

[Handler]
[MapGet("/api/todos/{id:int}")]
public sealed partial class GetTodoQuery(TodoRepository repository)
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
	) => ValueTask.FromResult(repository.GetById(query.Id));
}
```

`TransformResult` converts the handler's return value into an `IResult` before it leaves the
endpoint. It must be `internal static`, and it takes the handler's response type — here
`TodoItem?` — returning whatever you like. This is how a handler stays free of HTTP concepts
while the endpoint still returns a proper 404.

<Callout type="note">

The route constraint `{id:int}` is standard ASP.NET Core routing — Immediate.Apis passes the
route template through untouched. Route values bind case-insensitively, so `{id:int}` populates
the `Id` property.

</Callout>

## The write endpoint

```csharp title="Features/CompleteTodoCommand.cs" {23}
using Immediate.Apis.Shared;
using Immediate.Handlers.Shared;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Http;

namespace Todo.Features;

[Handler]
[MapPut("/api/todos/{id:int}/complete")]
public sealed partial class CompleteTodoCommand(TodoRepository repository)
{
	public sealed record Command
	{
		public required int Id { get; init; }
	}

	internal static Results<Ok<TodoItem>, NotFound> TransformResult(TodoItem? result) =>
		result is null
			? TypedResults.NotFound()
			: TypedResults.Ok(result);

	private ValueTask<TodoItem?> HandleAsync(
		[AsParameters] Command command,
		CancellationToken token
	) => ValueTask.FromResult(repository.Complete(command.Id));
}
```

<Callout type="warning" title="Why this one needs an explicit attribute">

`PUT` is one of the verbs that defaults to `[FromBody]`, along with `POST` and `PATCH`. This
command has no body — its only input is the route value — so the inferred binding would leave
`Id` unset. An explicit attribute on the request parameter always wins over inference. See
[Binding request data](/docs/Immediate.Apis/binding-request-data).

</Callout>

## Validation failures as ProblemDetails

Right now an invalid `POST /api/todos` throws `ValidationException` and produces a 500. Wire it
to a 400 once, for every endpoint:

```csharp title="Program.cs" {4}
builder.Services.AddProblemDetails(ConfigureProblemDetails);

static void ConfigureProblemDetails(ProblemDetailsOptions options) =>
	options.CustomizeProblemDetails = c =>
	{
		if (c.Exception is null)
			return;

		c.ProblemDetails = c.Exception switch
		{
			ValidationException ex => new ValidationProblemDetails(
				ex.Errors
					.GroupBy(x => x.PropertyName, StringComparer.OrdinalIgnoreCase)
					.ToDictionary(
						x => x.Key,
						x => x.Select(e => e.ErrorMessage).ToArray(),
						StringComparer.OrdinalIgnoreCase
					)
			)
			{
				Status = StatusCodes.Status400BadRequest,
			},

			_ => new ProblemDetails
			{
				Detail = "An error has occurred.",
				Status = StatusCodes.Status500InternalServerError,
			},
		};

		c.HttpContext.Response.StatusCode =
			c.ProblemDetails.Status ?? StatusCodes.Status500InternalServerError;
	};
```

You also need the exception handler middleware for `c.Exception` to be populated:

```csharp title="Program.cs"
app.UseExceptionHandler();
app.UseStatusCodePages();
```

Now the per-endpoint `try`/`catch` from the previous page can go.

## Run it

```bash title="terminal"
dotnet run
```

```bash title="terminal"
curl http://localhost:5000/api/todos
curl http://localhost:5000/api/todos/1
curl -X POST http://localhost:5000/api/todos -H 'content-type: application/json' -d '{"title":""}'
# 400 with {"errors":{"Title":["'Title' must not be empty."]}}
curl -X PUT http://localhost:5000/api/todos/1/complete
```

## What you have

A four-endpoint HTTP API where no file contains both routing and business logic, and where
validation failures become well-formed 400s automatically.

## Up next

[Caching a query](/docs/getting-started/tutorial/caching) — `GetTodoQuery` gets an in-memory
cache, invalidated when a todo is completed.
