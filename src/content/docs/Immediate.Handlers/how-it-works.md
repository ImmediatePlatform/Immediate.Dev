---
title: How it works
description: The exact files and members the generator emits, and how to read them when DI resolution fails.
order: 10
group: Reference
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Handlers emits one file per handler plus one file per assembly. If a handler will not resolve
from the container, or a behavior is not running, reading the generated code answers the question
directly. See [How source generation works](/docs/concepts/source-generation) for how to make the
generated files appear on disk.

<Callout type="note">

The generator fully qualifies type names with <code>global::</code>. Those prefixes are omitted
from the listings below for readability.

</Callout>

## File names

| File                                  | Contents         |
| ------------------------------------- | ---------------- |
| `IH.<Namespace>.<Class>.g.cs`         | one per handler  |
| `IH.ServiceCollectionExtensions.g.cs` | one per assembly |

A handler in the global namespace produces `IH..<Class>.g.cs` — the empty segment between the dots is
expected, not a bug.

## What is emitted per handler

Take this handler:

```csharp title="GetUsersQuery.cs"
namespace Application;

[Handler]
[Behaviors(typeof(LoggingBehavior<,>))]
public static partial class GetUsersQuery
{
	public sealed record Query;

	private static ValueTask<IEnumerable<User>> HandleAsync(
		Query query,
		UsersService usersService,
		CancellationToken token
	) => usersService.GetUsers(token);
}
```

`IH.Application.GetUsersQuery.g.cs` adds three members to the partial class.

### `Handler`

```csharp title="IH.Application.GetUsersQuery.g.cs"
partial class GetUsersQuery
{
	[GeneratedCode("Immediate.Handlers", "…")]
	public sealed partial class Handler : IHandler<GetUsersQuery.Query, IEnumerable<User>>
	{
		private readonly GetUsersQuery.HandleBehavior _handleBehavior;
		private readonly LoggingBehavior<GetUsersQuery.Query, IEnumerable<User>> _loggingBehavior;

		public Handler(
			GetUsersQuery.HandleBehavior handleBehavior,
			LoggingBehavior<GetUsersQuery.Query, IEnumerable<User>> loggingBehavior
		)
		{
			var handlerType = typeof(GetUsersQuery);

			_handleBehavior = handleBehavior;

			_loggingBehavior = loggingBehavior;
			_loggingBehavior.HandlerType = handlerType;

			_loggingBehavior.SetInnerHandler(_handleBehavior);
		}

		public async ValueTask<IEnumerable<User>> HandleAsync(
			GetUsersQuery.Query request,
			CancellationToken cancellationToken = default
		)
		{
			return await _loggingBehavior
				.HandleAsync(request, cancellationToken)
				.ConfigureAwait(false);
		}
	}
	// …
}
```

Reading this class tells you everything about the pipeline:

- The constructor takes the `HandleBehavior` first, then **one parameter per applicable behavior, in
  reverse pipeline order** — innermost first, outermost last. A behavior listed twice appears twice,
  with the second field named `_loggingBehavior1`, so each occurrence resolves its own instance.
- Every behavior gets `HandlerType` set to `typeof(GetUsersQuery)` before any request runs.
- `SetInnerHandler` chains them; the last behavior's inner handler is the `HandleBehavior`.
- `HandleAsync` calls the **outermost** behavior, or the `HandleBehavior` directly when the pipeline is
  empty.

If a behavior you expected is missing from the constructor, the generator decided it does not apply.
Work through the checklist on [Diagnostics](/docs/Immediate.Handlers/diagnostics).

`Handler` is declared `partial`, so you may add members to it in your own file.

### `HandleBehavior`

This is the innermost pipeline entry and the only place your handle method is called. Its shape depends
on whether the handler is static or sealed.

For a **static handler**, the extra handle-method parameters become its constructor parameters, with any
attributes copied across verbatim:

```csharp title="static handler"
[GeneratedCode("Immediate.Handlers", "…")]
[EditorBrowsable(EditorBrowsableState.Never)]
public sealed class HandleBehavior : Behavior<GetUsersQuery.Query, IEnumerable<User>>
{
	private readonly UsersService _usersService;

	public HandleBehavior(UsersService usersService)
	{
		_usersService = usersService;
	}

	public override async ValueTask<IEnumerable<User>> HandleAsync(
		GetUsersQuery.Query request,
		CancellationToken cancellationToken
	)
	{
		return await GetUsersQuery
			.HandleAsync(request, _usersService, cancellationToken)
			.ConfigureAwait(false);
	}
}
```

For a **sealed instance handler**, it takes the container class instead, and your dependencies are
resolved into that:

```csharp title="sealed handler"
public sealed class HandleBehavior : Behavior<GetUsersQuery.Query, IEnumerable<User>>
{
	private readonly GetUsersQuery _container;

	public HandleBehavior(GetUsersQuery container)
	{
		_container = container;
	}

	public override async ValueTask<IEnumerable<User>> HandleAsync(
		GetUsersQuery.Query request,
		CancellationToken cancellationToken
	)
	{
		return await _container
			.HandleAsync(request, cancellationToken)
			.ConfigureAwait(false);
	}
}
```

Two details worth knowing:

- When the handle method omits the `CancellationToken`, the call site simply omits the argument — the
  token is not forwarded anywhere.
- For a command handler returning a bare `ValueTask`, the generated method `await`s your call and then
  `return default;`, supplying the implicit `ValueTuple` response.

Streaming handlers derive from `StreamingBehavior<,>` instead, return `IAsyncEnumerable<TResponse>`
directly, and do not `await` — the enumerable is passed straight through.

### `AddHandlers`

```csharp
[GeneratedCode("Immediate.Handlers", "…")]
[EditorBrowsable(EditorBrowsableState.Never)]
public static IServiceCollection AddHandlers(
	IServiceCollection services,
	ServiceLifetime lifetime = ServiceLifetime.Scoped
)
{
	services.Add(new(typeof(GetUsersQuery.Handler), typeof(GetUsersQuery.Handler), lifetime));
	services.Add(new(typeof(IHandler<GetUsersQuery.Query, IEnumerable<User>>), typeof(GetUsersQuery.Handler), lifetime));
	services.Add(new(typeof(GetUsersQuery.HandleBehavior), typeof(GetUsersQuery.HandleBehavior), lifetime));
	return services;
}
```

A fourth `services.Add` for the container class itself appears for sealed instance handlers.

This is a plain static method, not an extension method. `[EditorBrowsable(Never)]` keeps it out of
IntelliSense even though it is `public` and callable.

## What is emitted per assembly

`IH.ServiceCollectionExtensions.g.cs` holds a single `HandlerServiceCollectionExtensions` class, placed
in the project's `RootNamespace`.

```csharp title="IH.ServiceCollectionExtensions.g.cs"
public static class HandlerServiceCollectionExtensions
{
	public static IServiceCollection AddApplicationBehaviors(this IServiceCollection services)
	{
		ServiceCollectionDescriptorExtensions.TryAddTransient(services, typeof(LoggingBehavior<,>));
		return services;
	}

	public static IServiceCollection AddApplicationHandlers(
		this IServiceCollection services,
		ServiceLifetime lifetime = ServiceLifetime.Scoped,
		params ReadOnlySpan<string> tags
	)
	{
		GetUsersQuery.AddHandlers(services, lifetime);

		if (tags is [] || Intersects(tags, ["worker"]))
		{
			RebuildSearchIndexCommand.AddHandlers(services, ServiceLifetime.Singleton);
		}

		return services;
	}

	private static bool Intersects(ReadOnlySpan<string> first, ReadOnlySpan<string> second)
	{
		foreach (var f in first)
			foreach (var s in second)
				if (string.Equals(f, s, StringComparison.Ordinal))
					return true;

		return false;
	}
}
```

Everything about registration is visible here:

- Untagged handlers are emitted unguarded, which is why they are always registered.
- Tagged handlers are grouped by their exact tag set and wrapped in
  `if (tags is [] || Intersects(...))` — the `tags is []` arm is why passing no tags registers
  everything.
- `Intersects` is ordinal, which is why tag matching is case-sensitive with no wildcards.
- A handler with `[Handler(ServiceLifetime.Singleton)]` has its lifetime emitted as a literal, ignoring
  the `lifetime` parameter.
- Behaviors go through `TryAddTransient` with the **open generic** definition, ignoring `lifetime`
  entirely.
- `params ReadOnlySpan<string>` is emitted for C# 13 and later; on C# 12 and below the generator emits
  `params string[]` instead.

## When the generator emits nothing

Some inputs make the generator bail out rather than emit partial results:

| Input                                                                                                                     | Effect                                                                  |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Handler is nested, has no handle method, has two, or returns `Task<T>`                                                    | that handler's file is not emitted                                      |
| A `[Behaviors]` entry on a handler is invalid — abstract, bound generic, more than two type parameters, or not a behavior | that handler's file is not emitted                                      |
| An **assembly-level** `[Behaviors]` entry is invalid                                                                      | **nothing** is emitted, including `IH.ServiceCollectionExtensions.g.cs` |

In the first two rows an IHR diagnostic normally points at the cause. The exception is an `abstract`
behavior type, which no analyzer flags — see the warning on [Creating
behaviors](/docs/Immediate.Handlers/creating-behaviors). If `AddXxxHandlers` itself does not exist,
suspect an invalid assembly-level `[Behaviors]` entry before anything else.
