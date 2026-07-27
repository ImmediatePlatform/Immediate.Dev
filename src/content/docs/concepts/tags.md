---
title: Tags and conditional registration
description: Register or map only part of an assembly by tagging items and filtering at the call site.
order: 4
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Four packages support tags: Immediate.Handlers, Immediate.Apis, Immediate.Injections and
Immediate.Jobs. The mechanism is shared, and the semantics are easy to get backwards, so they are
stated precisely here. Package-specific examples live on each package's tagged-registration
page.

The use case is one assembly, several hosts. A web host maps the HTTP endpoints; a worker host
registers the background handlers; both share the same shared services.

## Declaring tags

Tags are declared on the item, as a string array:

```csharp
[Handler(Tags = ["worker"])]
public sealed partial class ProcessOutboxCommand { /* … */ }

[Handler(Tags = ["fulfillment"]), Job]
public sealed partial class ReserveInventoryJob { /* … */ }

[MapGet("/api/todos", Tags = ["web"])]
public sealed partial class GetTodosQuery { /* … */ }

[RouteGroup("/api/admin", Tags = ["admin"])]
public static partial class AdminGroup { }

[RegisterScoped(Tags = ["worker"])]
public sealed class OutboxProcessor { /* … */ }
```

## Filtering at the call site

Filtering happens where you register, not where you declare:

```csharp title="Program.cs"
// Worker host — background handlers and their services only
services.AddTodoHandlers(tags: "worker");
services.AddTodoServices("worker");
services.AddTodoJobs(tags: ["fulfillment"]);

// Web host — HTTP endpoints only
app.MapTodoEndpoints(tags: "web");
```

## The four rules

<Callout type="warning" title="Read these before using tags">
<ol>
<li><strong>Calling with no tags registers everything</strong>, tagged items included. Tags are
a filter you opt into, not a gate that hides items by default.</li>
<li><strong>Untagged items are always registered</strong>, whatever tags you pass. There is no
way to exclude an untagged item by tagging the others.</li>
<li>Matching is <strong>ordinal string equality</strong>. No wildcards, no prefixes, no
case-insensitivity — <code>"Web"</code> does not match <code>"web"</code>.</li>
<li>An item matches if it carries <strong>any</strong> of the tags you passed.</li>
</ol>
</Callout>

Rules 1 and 2 together mean tags are additive: they let you pull in an extra slice of the
assembly, not carve one out. If a handler must never be registered in the web host, tagging is
the wrong tool — put it in a different assembly.

## The `tags` parameter signature

The generated parameter adapts to your project's C# language version:

| Language version  | Signature                     |
| ----------------- | ----------------------------- |
| C# 13 and later   | `params ReadOnlySpan<string>` |
| C# 12 and earlier | `params string[]`             |

Both are `params`, so the call site is identical either way — `AddTodoServices("web", "admin")`.
The difference only shows if you pass a pre-built collection, where the span form will not accept
a `List<string>` directly.

`AddXxxHandlers` takes a `lifetime` parameter before `tags`, so tags there are usually passed by
name:

```csharp
services.AddTodoHandlers(ServiceLifetime.Scoped, "worker");
services.AddTodoHandlers(tags: "worker");            // lifetime defaults to Scoped
```

`MapXxxEndpoints` takes an optional route `prefix` before `tags`:

```csharp
app.MapTodoEndpoints(tags: ["web"]);
app.MapTodoEndpoints("/v1", "web");
```

`AddXxxJobs` takes its optional options delegate before `tags`. It reads the job's
Immediate.Handlers `Tags` value; use the same filter for Jobs and Handlers so every selected job
has a generated handler at execution:

```csharp
services.AddTodoHandlers(tags: ["fulfillment"]);
services.AddTodoJobs(options => options.UseInMemory(), tags: ["fulfillment"]);
```

`AddXxxJobs` does not replace `AddXxxHandlers`. Job queue definitions are assembly-wide and remain
registered even when job tags filter which job definitions and schedulers are added.

## Where to go next

- [Immediate.Handlers — Tagged registration](/docs/Immediate.Handlers/tagged-registration)
- [Immediate.Apis — Tagged registration](/docs/Immediate.Apis/tagged-registration)
- [Immediate.Injections — Tagged registration](/docs/Immediate.Injections/tagged-registration)
- [Immediate.Jobs — Registration and hosting](/docs/Immediate.Jobs/registration-and-hosting)
