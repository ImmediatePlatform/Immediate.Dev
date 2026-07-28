---
title: Tagged registration
description: Tag registrations and pass tags to AddXxxServices to register only part of an assembly.
order: 7
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Every registration attribute accepts a `Tags` array. Passing tags to the generated
`AddXxxServices` method then narrows which tagged registrations are applied. The semantics are
shared with Immediate.Handlers and Immediate.Apis and are stated in full on
[Tags and conditional registration](/docs/concepts/tags) — this page covers the Injections
surface.

## Tagging a registration

```csharp title="Services.cs"
using Immediate.Injections.Shared;

// Only in the worker host
[RegisterScoped<IOutboxProcessor>(Tags = ["worker"])]
public sealed class OutboxProcessor : IOutboxProcessor;

// Only in the web host
[RegisterScoped<IHttpContextUserAccessor>(Tags = ["web"])]
public sealed class HttpContextUserAccessor : IHttpContextUserAccessor;

// Everywhere — untagged
[RegisterScoped<ITodoRepository>]
public sealed class TodoRepository : ITodoRepository;
```

`Tags` is `string[]?`, declared per attribute. A class carrying several registration attributes
tags each of them independently.

## Filtering at the call site

```csharp title="Worker/Program.cs"
builder.Services.AddTodoServices("worker");
```

```csharp title="Web/Program.cs"
builder.Services.AddTodoServices("web");
```

```csharp title="Tests/Setup.cs"
// No tags: registers everything, worker and web included
services.AddTodoServices();
```

An item matches if it carries **any** of the tags you passed, compared with ordinal string
equality.

<Callout type="warning" title="The two rules that catch people out">
<ol>
<li><strong>Calling with no tags registers everything</strong>, tagged registrations included.
Tags are an opt-in filter, not a gate.</li>
<li><strong>Untagged registrations are always applied</strong>, whatever tags you pass. Tagging
some classes does not exclude the rest.</li>
</ol>
Tags let you pull in an extra slice of the assembly; they cannot carve one out. If a service must
never reach the web host, put it in a different assembly.
</Callout>

## What the generator emits

Registrations are grouped by their tag set, and each group is wrapped in one guard:

```csharp title="Generated output"
if (tags is [] || Intersects(tags, ["worker"]))
{
	ServiceCollectionDescriptorExtensions.Add(
		services,
		ServiceDescriptor.Scoped(typeof(IOutboxProcessor), typeof(OutboxProcessor))
	);
}

// untagged registrations are emitted with no guard at all
ServiceCollectionDescriptorExtensions.Add(
	services,
	ServiceDescriptor.Scoped(typeof(ITodoRepository), typeof(TodoRepository))
);
```

`Intersects` is a plain nested loop over the two string spans. Tag order within the attribute
does not matter — the generator sorts the tag list when grouping, so `["a", "b"]` and
`["b", "a"]` land in the same group.

## Tags reach manual registrations too

A `[RegisterServices]` method can declare a second `ReadOnlySpan<string>` parameter and receive
exactly the tags that were passed to `AddXxxServices`, so hand-written registration code can
apply the same filter. See [Manual registration](/docs/Immediate.Injections/manual-registration).

## The `tags` parameter type

`AddXxxServices` declares its parameter as `params ReadOnlySpan<string>` on C# 13 and later, and
`params string[]` on C# 12 and earlier. Both are `params`, so `AddTodoServices("web", "admin")`
is identical either way.

## Where to go next

- [Tags and conditional registration](/docs/concepts/tags) — the shared semantics
- [Manual registration](/docs/Immediate.Injections/manual-registration)
- [How it works](/docs/Immediate.Injections/how-it-works)
