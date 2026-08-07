---
title: Tagged registration
description: Register a subset of an assembly's handlers per host by tagging them and filtering at the call site.
order: 7
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

When one assembly of handlers is consumed by more than one host — a web API and a background worker
sharing an application project, say — you rarely want every host to register every handler. Tags let
you declare which group a handler belongs to and filter at the registration call.

## Tagging a handler

```csharp title="RebuildSearchIndexCommand.cs"
[Handler(Tags = ["worker"])]
public static partial class RebuildSearchIndexCommand
{
	public sealed record Command;

	private static ValueTask HandleAsync(Command command, CancellationToken token) =>
		// ..
}
```

A handler may carry several tags:

```csharp
[Handler(Tags = ["worker", "background"])]
```

`Tags` is an init-only `string[]?` property on `[Handler]`, so it combines with the lifetime
constructor argument when you need both:

```csharp
[Handler(ServiceLifetime.Singleton, Tags = ["worker"])]
```

## Filtering at registration

`AddXxxHandlers` takes the tags after the lifetime. Because the lifetime has a default, pass the tags by
name unless you are also setting a lifetime:

```csharp title="Worker/Program.cs"
builder.Services.AddApplicationHandlers(tags: "worker");
```

```csharp title="Api/Program.cs"
builder.Services.AddApplicationHandlers(tags: "web");
```

```csharp title="Tests/Fixture.cs"
// several tags, and a non-default lifetime
services.AddApplicationHandlers(ServiceLifetime.Transient, "worker", "web");
```

The `tags` parameter is `params ReadOnlySpan<string>` when the project compiles with C# 13 or later, and
`params string[]` on C# 12 and below. Either way you can pass loose arguments, an array, or a collection
expression.

## The rules that catch people out

<Callout type="warning">

- **Calling with no tags registers everything**, tagged handlers included. Tags narrow a registration;
  they never opt a handler out of the default call.
- **Untagged handlers are always registered**, whatever tags you pass. A handler with no `Tags` is
  shared infrastructure and belongs to every host.
- Matching is **ordinal string equality**. No wildcards, no prefixes, no case-insensitivity — `"Worker"`
  and `"worker"` are different tags.

</Callout>

The consequence worth internalising: tagging is opt-in isolation for the _host_, not for the handler.
In the example above, the worker host gets `RebuildSearchIndexCommand` plus every untagged handler in
the assembly, and the API host gets everything untagged plus the `"web"` handlers.

If you want strict separation, tag every handler.

## Behavior registration follows the handler filter

Each selected handler registers the concrete behavior types in its generated pipeline. A behavior that
only applies to a handler excluded by the tag filter is therefore not registered. Shared concrete
behavior types use `TryAddTransient`, so they are added only once even when several selected handlers
reference them.

Tags behave the same way across Immediate.Handlers, Immediate.Apis and Immediate.Injections; the shared
semantics are described on [Tags and conditional
registration](/docs/concepts/tags).
