---
title: The assembly identifier
description: How the Xxx in generated registration and mapping methods is derived, and how to override it.
order: 3
---

Every ImmediatePlatform generator emits assembly-level registration methods whose names contain
an identifier derived from your assembly:

| Package              | Generated method                        |
| -------------------- | --------------------------------------- |
| Immediate.Handlers   | `AddXxxHandlers()`, `AddXxxBehaviors()` |
| Immediate.Apis       | `MapXxxEndpoints()`                     |
| Immediate.Cache      | `AddXxxCaches()`                        |
| Immediate.Injections | `AddXxxServices()`                      |
| Immediate.Jobs       | `AddXxxJobs()`                          |

All five packages read the same source. Set it once and every generated method name changes
together.

## Default derivation

With no attribute present, the identifier is the assembly name with `.` and spaces removed, then
trimmed.

| Assembly name     | Identifier       | Method                        |
| ----------------- | ---------------- | ----------------------------- |
| `Web`             | `Web`            | `AddWebHandlers()`            |
| `Application.Web` | `ApplicationWeb` | `AddApplicationWebHandlers()` |
| `My Cool.App`     | `MyCoolApp`      | `AddMyCoolAppHandlers()`      |

## Overriding it

Apply the attribute anywhere in the assembly — conventionally in `Program.cs` or a dedicated
`AssemblyInfo.cs`:

```csharp title="Program.cs"
using Immediate.Handlers.Shared;

[assembly: ImmediateAssemblyIdentifier("Todo")]
```

Every applicable generator in the project now emits `AddTodoHandlers()`, `MapTodoEndpoints()`,
`AddTodoCaches()`, `AddTodoServices()` and `AddTodoJobs()`.

## Validity rules

The supplied value is used only if it is a **valid C# identifier** that does not start with `@`.
Otherwise the attribute is ignored and the default derivation is used instead.

```csharp
[assembly: ImmediateAssemblyIdentifier("Todo App")]   // ignored — space is not valid
[assembly: ImmediateAssemblyIdentifier("@Todo")]      // ignored — leading @
[assembly: ImmediateAssemblyIdentifier("")]           // ignored — empty
```
