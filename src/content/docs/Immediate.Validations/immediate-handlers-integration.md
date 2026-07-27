---
title: Integrating with Immediate.Handlers
description: Register ValidationBehavior so every request that can be validated is validated.
order: 9
group: Guides
sidebar:
  label: Handlers integration
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Calling `Validate` at the top of every handler is repetitive and easy to forget.
Immediate.Validations ships an Immediate.Handlers `Behavior<,>` that does it for you. Add it to
the assembly-wide behavior pipeline:

```csharp title="AssemblyAttributes.cs"
using Immediate.Handlers.Shared;
using Immediate.Validations.Shared;

[assembly: Behaviors(
	typeof(ValidationBehavior<,>)
)]
```

`ValidationBehavior<TRequest, TResponse>` is constrained to
`where TRequest : IValidationTarget<TRequest>`. Immediate.Handlers only inserts a behavior into a
pipeline when its constraints are satisfied, so the behavior applies automatically to every
handler whose request type declares `IValidationTarget<T>`, and is silently omitted for every
handler whose request does not. There is nothing per-handler to configure.

```csharp title="GetUser.cs"
[Handler]
public static partial class GetUser
{
	[Validate]
	public sealed partial record Query : IValidationTarget<Query>
	{
		[GreaterThan(0)]
		public required int Id { get; init; }
	}

	private static async ValueTask<User> HandleAsync(
		Query query,
		UsersService usersService,
		CancellationToken token
	) => await usersService.GetUserAsync(query.Id, token);
}
```

Sending a `Query` with `Id` of `0` never reaches `HandleAsync`; the behavior throws a
`ValidationException` first.

## Where it sits in the pipeline

Behaviors run outermost-first in the order they are listed. `ValidationBehavior<,>` calls
`ValidationException.ThrowIfInvalid(request)` and only then invokes the next stage, so anything
listed _after_ it is skipped for an invalid request, and anything listed _before_ it — logging,
metrics, a transaction scope — still runs and observes the exception. Put it early if you want
validation to be cheap, later if you want cross-cutting concerns to see invalid requests. See
[Handlers and the behavior pipeline](/docs/concepts/handlers-and-behaviors).

<Callout type="note" title="IV0011">

If your assembly declares `[assembly: Behaviors(...)]` without `ValidationBehavior<,>` in the
list, the analyzer reports **IV0011** (warning): validation targets would be generated but
never executed by the pipeline. The check only looks at the assembly-level attribute — a
handler-level `[Behaviors]` that replaces the assembly list is not inspected, so a handler that
overrides the pipeline can silently lose validation.

</Callout>

## Handler-level pipelines

A `[Behaviors]` attribute on a handler replaces the assembly list for that handler rather than
adding to it. If you override the pipeline for a handler whose request is a validation target,
include `ValidationBehavior<,>` explicitly:

```csharp title="GetUser.cs"
[Handler]
[Behaviors(
	typeof(LoggingBehavior<,>),
	typeof(ValidationBehavior<,>)
)]
public static partial class GetUser
{
	// …
}
```

## Handling the exception

The failure surfaces as a `ValidationException` thrown out of the handler. Turning that into an
HTTP 400 with a field-keyed body is covered in
[Handling validation failures](/docs/Immediate.Validations/handling-failures).
