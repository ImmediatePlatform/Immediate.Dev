---
title: Creating behaviors
description: Build cross-cutting pipeline steps with the Behavior base class, and control which handlers they attach to.
order: 4
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Pipeline behaviors let you wrap your own logic around the handling of a request, which is how
cross-cutting concerns such as logging, transactions and validation are addressed. Immediate.Validations
runs its validation through exactly this mechanism.

If it helps, think of behaviors as filters, in the ASP.NET Core sense. The pipeline is assembled at
compile time: see [Handlers and the behavior
pipeline](/docs/concepts/handlers-and-behaviors) for the mental model.

## Anatomy of a behavior

Derive from `Immediate.Handlers.Shared.Behavior<TRequest, TResponse>`, override `HandleAsync`, and call
the inherited `Next` to invoke the rest of the pipeline.

```csharp title="LoggingBehavior.cs"
public sealed class LoggingBehavior<TRequest, TResponse>(
	ILogger<LoggingBehavior<TRequest, TResponse>> logger
) : Behavior<TRequest, TResponse>
{
	public override async ValueTask<TResponse> HandleAsync(
		TRequest request,
		CancellationToken cancellationToken
	)
	{
		logger.LogInformation("Entering {Handler}", HandlerType.Name);
		var response = await Next(request, cancellationToken);
		logger.LogInformation("Exiting {Handler}", HandlerType.Name);
		return response;
	}
}
```

`HandlerType` is a `System.Type` property on the base class that the generated handler sets to the
concrete handler container's type before the request runs — `typeof(GetUsersQuery)` in the example
above. It is useful for logging, metrics and telemetry tags, and saves you threading the handler name
through the request.

## Adding behaviors to the pipeline

There are three placements for `[Behaviors]`.

**Assembly-wide** — applies to every handler in the assembly:

```csharp title="AssemblyAttributes.cs"
[assembly: Behaviors(
	typeof(LoggingBehavior<,>),
	typeof(TransactionBehavior<,>)
)]
```

**On a single handler**:

```csharp title="GetUsersQuery.cs"
[Handler]
[Behaviors(
	typeof(LoggingBehavior<,>)
)]
public static partial class GetUsersQuery
{
	// ..
}
```

**As a reusable bundle**, by putting `[Behaviors]` on an attribute of your own and applying that
attribute to handlers:

```csharp title="DefaultBehaviorsAttribute.cs"
[Behaviors(
	typeof(ValidationBehavior<,>),
	typeof(TransactionBehavior<,>)
)]
public sealed class DefaultBehaviorsAttribute : Attribute;
```

```csharp title="GetUsersQuery.cs"
[Handler]
[DefaultBehaviors]
public static partial class GetUsersQuery
{
	// ..
}
```

<Callout type="warning">

A `[Behaviors]` attribute on a handler — directly or through a bundle attribute — **replaces** the
assembly-wide list for that handler; it does not append to it. Any global behavior you still want must
be repeated in the handler's list.

</Callout>

## Ordering, and repeating a behavior

**The first type listed is the outermost behavior**, so it enters first and exits last. Given
`[Behaviors(typeof(A<,>), typeof(B<,>))]`, a request flows `A` → `B` → your handle method, and unwinds
`B` → `A`.

The same behavior type may appear in the list more than once, and each occurrence becomes a separate
constructor parameter on the generated handler — so each gets its own instance from the container.
`[Behaviors(typeof(A<,>), typeof(B<,>), typeof(A<,>))]` runs `A`, `B`, `A`, your method, `A`, `B`, `A`.

## Generic arities

A behavior may fix either type, or both. All three shapes are supported and can be mixed in one
`[Behaviors]` list:

```csharp
// Two type parameters — applies to any handler
public sealed class DoubleTypeBehavior<TRequest, TResponse> : Behavior<TRequest, TResponse>;

// One type parameter — response fixed to string
public sealed class ResponseFixedBehavior<TRequest> : Behavior<TRequest, string>;

// One type parameter — request fixed to int
public sealed class RequestFixedBehavior<TResponse> : Behavior<int, TResponse>;

// Zero type parameters — both fixed
public sealed class ConcreteBehavior : Behavior<int, string>;
```

```csharp
[Behaviors(
	typeof(ConcreteBehavior),
	typeof(RequestFixedBehavior<>),
	typeof(ResponseFixedBehavior<>),
	typeof(DoubleTypeBehavior<,>)
)]
```

Generic behaviors must be referenced **unbound** — `typeof(LoggingBehavior<,>)`, never
`typeof(LoggingBehavior<Query, Response>)`, which reports
[IHR0008](/docs/Immediate.Handlers/diagnostics). More than two type parameters reports
[IHR0007](/docs/Immediate.Handlers/diagnostics).

## Constraints select which handlers a behavior attaches to

A generic constraint on `TRequest` or `TResponse` filters the handlers a behavior applies to. When the
pipeline is generated, every candidate behavior is checked against the handler's request and response
types; behaviors that do not match are dropped.

```csharp title="AuditBehavior.cs"
public sealed class AuditBehavior<TRequest, TResponse>(IAuditService audit)
	: Behavior<TRequest, TResponse>
	where TRequest : IAuditable
{
	// runs only for handlers whose request implements IAuditable
}
```

Constraint matching is more capable than a single interface check:

- Constraints are walked up the inheritance chain, so a behavior constrained to a base record also
  attaches to handlers whose request derives from it several levels down.
- Self-referential (CRTP) constraints such as `where TRequest : IConstraint<TRequest>` are supported,
  including interfaces with `static abstract` members.
- Multiple constraints on one type parameter are combined; the request must satisfy all of them.

<Callout type="danger" title="Nullability is part of the match">

Nullable reference annotations participate in matching. A behavior fixed to `IEnumerable<User>` will
**not** attach to a handler that returns `ValueTask<IEnumerable<User>?>`, and vice versa. This is a
common cause of "why isn't my behavior running".

</Callout>

What is _not_ supported is the non-type constraints: `class`, `struct`, `unmanaged`, `notnull` and
`new()`. Declaring any of them on a behavior's type parameters reports
[IHR0021](/docs/Immediate.Handlers/diagnostics).

When a behavior listed **on a handler** does not match that handler's types, it is dropped silently at
generation time, but [IHR0020](/docs/Immediate.Handlers/diagnostics) warns you that you asked
for something that will not happen. Behaviors listed assembly-wide are not warned about — dropping them
per handler is the whole point of constraints.

<Callout type="warning" title="Never list an abstract behavior">

An `abstract` behavior class passes every analyzer check but the generator cannot construct it, and
rather than skipping it, generation **stops**. If the abstract type is listed on one handler, that
handler's file is not emitted; if it is listed assembly-wide, nothing at all is emitted — no handler
files and no `Add…Handlers` method. The symptom is a wave of "does not contain a definition for
`Handler`" errors with no Immediate.Handlers diagnostic pointing at the cause. List concrete behavior
types only.

</Callout>

## Registering behaviors

Behaviors are registered by `services.AddXxxBehaviors()`, which registers every type referenced in any
`[Behaviors]` attribute in the assembly, including handler-level and bundle attributes. See
[Registering with `IServiceCollection`](/docs/Immediate.Handlers/registration) for what lifetime they
get.
