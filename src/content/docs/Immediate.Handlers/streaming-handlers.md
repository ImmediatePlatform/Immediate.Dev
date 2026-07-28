---
title: Streaming handlers
description: Return IAsyncEnumerable from a handler to stream results, and wrap them with streaming behaviors.
order: 5
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

When a response is produced incrementally — paging through a data source, tailing a log, projecting a
large query — a handler can return `IAsyncEnumerable<TResponse>` instead of `ValueTask<TResponse>`.

There is no separate attribute and no separate registration call. A handler is a streaming handler
purely because its handle method returns `IAsyncEnumerable<T>`.

## Writing a streaming handler

```csharp title="StreamItems.cs"
using System.Runtime.CompilerServices;
using Immediate.Handlers.Shared;

namespace Application;

[Handler]
public static partial class StreamItems
{
	public sealed record Query(int Count);

	private static async IAsyncEnumerable<int> HandleAsync(
		Query query,
		[EnumeratorCancellation] CancellationToken token
	)
	{
		for (var i = 0; i < query.Count; i++)
		{
			await Task.Yield();
			yield return i;
		}
	}
}
```

<Callout type="warning">

The `[EnumeratorCancellation]` attribute on the `CancellationToken` parameter is required for the token
passed to `HandleAsync` to reach the enumerator. Without it the compiler warns with CS8425 and the token
your caller supplies is silently ignored once iteration begins.

</Callout>

Everything else on [Creating handlers](/docs/Immediate.Handlers/creating-handlers) still applies: the
class must be `partial` and not nested, the handle method must be `private` and named `Handle` or
`HandleAsync`, and dependencies work exactly as described in [Handler
dependencies](/docs/Immediate.Handlers/handler-dependencies).

## Consuming a streaming handler

The generated `StreamItems.Handler` implements `IStreamingHandler<StreamItems.Query, int>`, so consumers
can take either the concrete class or the interface:

```csharp title="Consumer.cs"
public sealed class Consumer(IStreamingHandler<StreamItems.Query, int> handler)
{
	public async Task Run(CancellationToken token)
	{
		await foreach (var item in handler.HandleAsync(new(5), token))
			Console.WriteLine(item);
	}
}
```

Note that `IStreamingHandler<,>.HandleAsync` returns the enumerable synchronously — there is no `await`
on the call itself, only on the `foreach`.

## Streaming behaviors

A behavior for a streaming pipeline derives from `StreamingBehavior<TRequest, TResponse>` rather than
`Behavior<TRequest, TResponse>`, and its `HandleAsync` returns `IAsyncEnumerable<TResponse>`. `Next`
returns an enumerable too, so you iterate it and re-yield.

```csharp title="StreamingLoggingBehavior.cs"
public sealed class StreamingLoggingBehavior<TRequest, TResponse>(
	ILogger<StreamingLoggingBehavior<TRequest, TResponse>> logger
) : StreamingBehavior<TRequest, TResponse>
{
	public override async IAsyncEnumerable<TResponse> HandleAsync(
		TRequest request,
		[EnumeratorCancellation] CancellationToken cancellationToken
	)
	{
		logger.LogInformation("Entering {Handler}", HandlerType.Name);

		await foreach (var item in Next(request, cancellationToken))
			yield return item;

		logger.LogInformation("Exiting {Handler}", HandlerType.Name);
	}
}
```

`[EnumeratorCancellation]` is required here for the same reason it is required on the handler.

<Callout type="note">

Because the behavior wraps the enumeration rather than a single call, the "exit" side runs only when the
consumer enumerates to completion. A consumer that breaks out of the `foreach` early, or an exception
mid-stream, will not reach code after the loop unless you write the `try`/`finally` yourself.

</Callout>

## Mixing streaming and non-streaming behaviors

Streaming behaviors are added to the pipeline in exactly the same three ways as ordinary behaviors —
assembly-wide, on a handler, or through a bundle attribute — and all the ordering and constraint rules
on [Creating behaviors](/docs/Immediate.Handlers/creating-behaviors) apply unchanged.

The two kinds coexist in a single list. When a handler's pipeline is built, behaviors whose kind does
not match the handler's kind are filtered out first, so you can write:

```csharp title="AssemblyAttributes.cs"
[assembly: Behaviors(
	typeof(LoggingBehavior<,>),
	typeof(StreamingLoggingBehavior<,>)
)]
```

and the non-streaming `LoggingBehavior` attaches only to `ValueTask` handlers while
`StreamingLoggingBehavior` attaches only to `IAsyncEnumerable` handlers. Neither interferes with the
other, and neither needs a constraint to stay out of the other's way.

Both are registered by the same `services.AddXxxBehaviors()` call.
