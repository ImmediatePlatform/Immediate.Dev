---
title: Attributes and interfaces
description: The complete public surface of Immediate.Handlers.Shared, with signatures and examples.
order: 9
group: Reference
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Everything you write against lives in the `Immediate.Handlers.Shared` namespace, shipped inside the
`Immediate.Handlers` package.

| Type                                     | Kind           | Applies to                    |
| ---------------------------------------- | -------------- | ----------------------------- |
| `HandlerAttribute`                       | Attribute      | class                         |
| `BehaviorsAttribute`                     | Attribute      | class, assembly               |
| `ImmediateAssemblyIdentifierAttribute`   | Attribute      | assembly                      |
| `IHandler<TRequest, TResponse>`          | Interface      | implemented by generated code |
| `IStreamingHandler<TRequest, TResponse>` | Interface      | implemented by generated code |
| `Behavior<TRequest, TResponse>`          | Abstract class | you derive from it            |
| `StreamingBehavior<TRequest, TResponse>` | Abstract class | you derive from it            |

## `[Handler]`

```csharp
[AttributeUsage(AttributeTargets.Class)]
public sealed class HandlerAttribute : Attribute
{
	public HandlerAttribute();
	public HandlerAttribute(ServiceLifetime serviceLifetime);

	public ServiceLifetime? ServiceLifetime { get; }
	public string[]? Tags { get; init; }
}
```

Marks a class for handler generation. The class must be `partial` and not nested. Only classes are
valid targets — a `record` or `struct` cannot be a handler container, though the request and response
types may be anything.

`ServiceLifetime` overrides the app-wide lifetime for this handler only; when `null` the handler is
registered with whatever was passed to `AddXxxHandlers`, which defaults to `Scoped`. `Tags` filters the
handler out of registration calls that pass a non-overlapping tag list.

```csharp
[Handler]
[Handler(ServiceLifetime.Singleton)]
[Handler(Tags = ["worker"])]
[Handler(ServiceLifetime.Transient, Tags = ["worker", "background"])]
```

See [Registering with `IServiceCollection`](/docs/Immediate.Handlers/registration) and [Tagged
registration](/docs/Immediate.Handlers/tagged-registration).

## `[Behaviors]`

```csharp
[AttributeUsage(AttributeTargets.Assembly | AttributeTargets.Class)]
public sealed class BehaviorsAttribute(params Type[] types) : Attribute
{
	public Type[] Types { get; }
}
```

Declares the behavior pipeline. Three placements:

```csharp
// 1. assembly-wide — every handler in the assembly
[assembly: Behaviors(typeof(LoggingBehavior<,>))]

// 2. on a handler — replaces the assembly-wide list for that handler
[Handler]
[Behaviors(typeof(LoggingBehavior<,>))]
public static partial class GetUsersQuery
{
	// ..
}

// 3. on an attribute of your own — a reusable bundle
[Behaviors(typeof(ValidationBehavior<,>), typeof(TransactionBehavior<,>))]
public sealed class DefaultBehaviorsAttribute : Attribute;
```

Generic behaviors must be listed unbound. The first type listed is the outermost in the pipeline. See
[Creating behaviors](/docs/Immediate.Handlers/creating-behaviors).

## `[assembly: ImmediateAssemblyIdentifier]`

```csharp
[AttributeUsage(AttributeTargets.Assembly)]
public sealed class ImmediateAssemblyIdentifierAttribute(string identifier) : Attribute
{
	public string Identifier { get; }
}
```

Replaces the assembly name in the generated `AddXxxHandlers` and `AddXxxBehaviors` method names.

```csharp title="AssemblyAttributes.cs"
[assembly: ImmediateAssemblyIdentifier("Application")]
// generates AddApplicationHandlers / AddApplicationBehaviors
```

The value must be a valid C# identifier and must not start with `@`; anything else reports
[IHR0023](/docs/Immediate.Handlers/diagnostics) and the assembly name is used instead. The same
attribute drives the generated method names in Immediate.Apis, Immediate.Cache and Immediate.Injections
— see [The assembly identifier](/docs/concepts/assembly-identifier), which also covers the trap for
projects that use Immediate.Injections without referencing Immediate.Handlers.

## `IHandler<TRequest, TResponse>`

```csharp
public interface IHandler<TRequest, TResponse>
{
	ValueTask<TResponse> HandleAsync(TRequest request, CancellationToken cancellationToken = default);
}
```

Implemented by every generated non-streaming `Handler`, and registered alongside the concrete class. Use
it when the consumer cannot reference the handler's assembly. For a command handler whose method returns
a bare `ValueTask`, `TResponse` is `System.ValueTuple`.

```csharp
public sealed class Consumer(IHandler<GetUsersQuery.Query, IEnumerable<User>> handler);
```

<Callout type="note">

Referencing an `IHandler<,>` for which no concrete handler exists in the compilation reports
[IHR0013](/docs/Immediate.Handlers/diagnostics).

</Callout>

## `IStreamingHandler<TRequest, TResponse>`

```csharp
public interface IStreamingHandler<TRequest, TResponse>
{
	IAsyncEnumerable<TResponse> HandleAsync(TRequest request, CancellationToken cancellationToken = default);
}
```

The streaming counterpart, implemented by handlers whose handle method returns
`IAsyncEnumerable<TResponse>`. `TResponse` is the _element_ type, not the enumerable. See [Streaming
handlers](/docs/Immediate.Handlers/streaming-handlers).

## `Behavior<TRequest, TResponse>`

```csharp
public abstract class Behavior<TRequest, TResponse>
{
	public Type HandlerType { get; [EditorBrowsable(EditorBrowsableState.Never)] set; }

	public abstract ValueTask<TResponse> HandleAsync(TRequest request, CancellationToken cancellationToken);

	protected ValueTask<TResponse> Next(TRequest request, CancellationToken cancellationToken);

	[EditorBrowsable(EditorBrowsableState.Never)]
	public void SetInnerHandler(Behavior<TRequest, TResponse> handler);
}
```

- **`HandleAsync`** — override this. Do your work, `await Next(...)`, do more work, return.
- **`Next`** — invokes the remainder of the pipeline. Throws `InvalidOperationException` if the inner
  handler has not been set, which only happens if you construct the behavior yourself and skip the
  wiring.
- **`HandlerType`** — set by the generated handler to the concrete handler container's type before the
  request runs. Its setter is hidden from IntelliSense and is for the generator's use.
- **`SetInnerHandler`** — called by generated code only; it throws if called twice.

## `StreamingBehavior<TRequest, TResponse>`

```csharp
public abstract class StreamingBehavior<TRequest, TResponse>
{
	public Type HandlerType { get; [EditorBrowsable(EditorBrowsableState.Never)] set; }

	public abstract IAsyncEnumerable<TResponse> HandleAsync(TRequest request, CancellationToken cancellationToken);

	protected IAsyncEnumerable<TResponse> Next(TRequest request, CancellationToken cancellationToken);

	[EditorBrowsable(EditorBrowsableState.Never)]
	public void SetInnerHandler(StreamingBehavior<TRequest, TResponse> handler);
}
```

Identical in shape, with `IAsyncEnumerable<TResponse>` in place of `ValueTask<TResponse>`. Override
`HandleAsync`, mark its token parameter `[EnumeratorCancellation]`, and re-yield the items from `Next`.

Streaming and non-streaming behaviors are matched to handlers separately, so listing both kinds in one
`[Behaviors]` attribute is safe.

## Generated members

The generator adds `Handler`, `HandleBehavior` and `AddHandlers` to each handler class, and a
`HandlerServiceCollectionExtensions` class per assembly. Those are described on [How it
works](/docs/Immediate.Handlers/how-it-works).
