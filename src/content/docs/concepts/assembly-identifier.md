---
title: The assembly identifier
description: How the Xxx in AddXxxHandlers, MapXxxEndpoints and AddXxxServices is derived, and how to override it.
order: 3
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Every ImmediatePlatform generator emits assembly-level registration methods whose names contain
an identifier derived from your assembly:

| Package              | Generated method                        |
| -------------------- | --------------------------------------- |
| Immediate.Handlers   | `AddXxxHandlers()`, `AddXxxBehaviors()` |
| Immediate.Apis       | `MapXxxEndpoints()`                     |
| Immediate.Cache      | `AddXxxCaches()`                        |
| Immediate.Injections | `AddXxxServices()`                      |

All four packages read the same source. Set it once and every generated method name changes
together.

## Default derivation

With no attribute present, the identifier is the assembly name with `.` and spaces removed, then
trimmed.

| Assembly name     | Identifier       | Method                        |
| ----------------- | ---------------- | ----------------------------- |
| `Web`             | `Web`            | `AddWebHandlers()`            |
| `Application.Web` | `ApplicationWeb` | `AddApplicationWebHandlers()` |
| `My Cool.App`     | `MyCoolApp`      | `AddMyCoolAppHandlers()`      |

<Callout type="warning" title="Hyphens are handled inconsistently across packages">

Immediate.Handlers and Immediate.Apis also strip `-`. Immediate.Cache and Immediate.Injections
do **not**. An assembly named `Todo-Web` therefore produces `AddTodoWebHandlers()` and
`MapTodoWebEndpoints()`, but `AddTodo-WebCaches()` and `AddTodo-WebServices()` — which are not
valid C# identifiers and will not compile.

If your assembly name contains a hyphen, set the identifier explicitly. This is an upstream
inconsistency, not something you can configure around otherwise.

</Callout>

## Overriding it

Apply the attribute anywhere in the assembly — conventionally in `Program.cs` or a dedicated
`AssemblyInfo.cs`:

```csharp title="Program.cs"
using Immediate.Handlers.Shared;

[assembly: ImmediateAssemblyIdentifier("Todo")]
```

Every generator in the project now emits `AddTodoHandlers()`, `MapTodoEndpoints()`,
`AddTodoCaches()` and `AddTodoServices()`.

## Validity rules

The supplied value is used only if it is a **valid C# identifier** that does not start with `@`.
Otherwise the attribute is ignored and the default derivation is used instead.

```csharp
[assembly: ImmediateAssemblyIdentifier("Todo App")]   // ignored — space is not valid
[assembly: ImmediateAssemblyIdentifier("@Todo")]      // ignored — leading @
[assembly: ImmediateAssemblyIdentifier("")]           // ignored — empty
```

<Callout type="note">
In a project that references <strong>Immediate.Handlers</strong>, an invalid value is reported as
<a href="/docs/Immediate.Handlers/diagnostics">IHR0023</a> — an error, and not configurable, so
you cannot ship a typo by accident. That analyzer ships in the Immediate.Handlers package only;
see the trap below for what happens without it.
</Callout>

## The cross-package trap

<Callout type="warning" title="The attribute is defined in Immediate.Handlers">
<code>ImmediateAssemblyIdentifierAttribute</code> lives in the
<strong>Immediate.Handlers</strong> package, in the
<code>Immediate.Handlers.Shared</code> namespace. Every other generator recognises it
<em>structurally</em> — it matches any type named
<code>Immediate.Handlers.Shared.ImmediateAssemblyIdentifierAttribute</code> with arity 0,
wherever that type came from.
</Callout>

This matters for **Immediate.Injections**, which is otherwise independent of
Immediate.Handlers. A project that installs only Immediate.Injections and writes
`[assembly: ImmediateAssemblyIdentifier("Todo")]` will not compile at all — the attribute type
does not exist. Add a reference to Immediate.Handlers and it starts working. But if you instead
declare a _similarly_ named type of your own in a different namespace, the attribute compiles,
the generator does not recognise it, and you silently get `AddMyAppServices()` instead of
`AddTodoServices()` with no diagnostic at all.

If you want the override without taking a dependency on Immediate.Handlers, declare a matching
type yourself — same namespace, same name, arity 0:

```csharp title="ImmediateAssemblyIdentifierAttribute.cs"
namespace Immediate.Handlers.Shared;

[AttributeUsage(AttributeTargets.Assembly)]
internal sealed class ImmediateAssemblyIdentifierAttribute(string identifier) : Attribute
{
	public string Identifier { get; } = identifier;
}
```

The namespace and name must match exactly. Note that IHR0023 does not apply here either — with
no Immediate.Handlers reference there is no analyzer to validate the value, so an invalid
identifier falls back to the assembly name silently.

## Practical advice

Set the identifier explicitly in any solution with more than one project that uses the platform.
Two assemblies whose names differ only by punctuation collapse onto the same identifier, and the
resulting `AddApplicationWebHandlers()` ambiguity is much harder to diagnose than a one-line
attribute is to write.
