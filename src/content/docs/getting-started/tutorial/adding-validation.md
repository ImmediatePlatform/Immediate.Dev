---
title: Adding validation
description: Validate a command with [Validate] and IValidationTarget, run through ValidationBehavior.
order: 6
group: Tutorial
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Validations validates a request _before_ the handler runs, as a behavior in the
pipeline. You annotate properties with validator attributes; the generator writes the validation
method.

## A command that needs validating

```csharp title="Features/CreateTodoCommand.cs"
using Immediate.Handlers.Shared;
using Immediate.Validations.Shared;

namespace Todo.Features;

[Handler]
public sealed partial class CreateTodoCommand(TodoRepository repository)
{
	[Validate]
	public sealed partial record Command : IValidationTarget<Command>
	{
		[NotEmpty]
		[MaxLength(200)]
		public required string Title { get; init; }
	}

	public sealed record Response(TodoItem Item);

	private ValueTask<Response> HandleAsync(
		Command command,
		CancellationToken token
	) => ValueTask.FromResult(new Response(repository.Add(command.Title)));
}
```

Three pieces make this work:

- **`[Validate]`** tells the generator to emit a validation method for this type.
- **`partial`** — the generated method is added to your type.
- **`IValidationTarget<Command>`** is what the behavior looks for at compile time. Leaving it off
  produces `IV0013`, with a code fix that adds it.

`[NotEmpty]` and `[MaxLength(200)]` are two of fifteen built-in validators — see the
[full list](/docs/Immediate.Validations/built-in-validators).

<Callout type="note" title="Two validators you get without asking">
<ul>
<li>The generator adds a null check to every non-nullable reference type property automatically,
so <code>Title</code> is checked even without <code>[NotNull]</code>. Use <code>[AllowNull]</code>
to opt out of that check.</li>
<li>The generator applies <code>EnumValue</code> to every enum-typed property.</li>
</ul>
</Callout>

## Register the behavior

Validation runs because `ValidationBehavior<,>` is in the pipeline. Add it assembly-wide:

```csharp title="Program.cs" {1}
[assembly: Behaviors(typeof(ValidationBehavior<,>))]
```

Put that at the top of `Program.cs`, above the top-level statements, or in an `AssemblyInfo.cs`.
Then register the behaviors:

```csharp title="Program.cs" {4}
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<TodoRepository>();
builder.Services.AddTodoBehaviors();
builder.Services.AddTodoHandlers();
```

<Callout type="warning">
A <code>[Behaviors]</code> attribute on an individual handler <strong>replaces</strong> the
assembly-wide list for that handler rather than adding to it. If you put one on
<code>CreateTodoCommand</code>, you must list <code>ValidationBehavior&lt;,&gt;</code> there too.
<code>IV0011</code> warns when the assembly list omits it entirely.
</Callout>

## What a failure looks like

`ValidationBehavior<,>` throws `ValidationException` when the request is invalid. The handler
method never runs.

```csharp title="Program.cs"
app.MapPost("/", async (
	string title,
	CreateTodoCommand.Handler handler,
	CancellationToken token) =>
{
	try
	{
		var response = await handler.HandleAsync(new() { Title = title }, token);
		return Results.Ok(response.Item);
	}
	catch (ValidationException ex)
	{
		return Results.BadRequest(ex.Errors);
	}
});
```

Each entry in `ex.Errors` is a `ValidationError` carrying the property name and the rendered
message:

```json
[{ "PropertyName": "Title", "ErrorMessage": "'Title' must not be empty." }]
```

Property names use a dotted path for nested types and an indexed suffix for collections —
`Items[0].Title`. The exact rules matter if you're rendering field-level errors in a UI; they're
spelled out in
[Nested and collection validation](/docs/Immediate.Validations/nested-and-collection-validation).

Catching the exception per-endpoint like this is fine for now. The next page replaces it with
proper `ProblemDetails` wiring that covers every endpoint at once.

## Validating without a handler

The generated method is also callable directly, which is handy in tests:

```csharp
var errors = CreateTodoCommand.Command.Validate(command);
if (!errors.IsValid)
{
	// inspect errors
}
```

See [Validating instances](/docs/Immediate.Validations/validating-instances) for the
`ThrowIfInvalid` overloads.

## What you have

Requests validated before your code runs, with the validation logic generated from attributes and
no validator classes to maintain.

## Up next

[Exposing an HTTP endpoint](/docs/getting-started/tutorial/exposing-endpoints) — all four
handlers become minimal-API endpoints, and validation failures turn into a proper 400.
