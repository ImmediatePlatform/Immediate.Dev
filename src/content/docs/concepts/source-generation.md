---
title: How source generation works
description: Why ImmediatePlatform generates code at compile time instead of using reflection, and how to inspect what it produces.
order: 1
---

Every ImmediatePlatform package is a Roslyn source generator. Nothing in the platform scans
assemblies, builds expression trees, or resolves types by name at runtime. When you write a
handler, an endpoint, a validator, a job or a registration attribute, the corresponding generator reads
your code during compilation and writes ordinary C# alongside it.

## What that buys you

- **No reflection, no runtime scanning.** Startup does not walk your assemblies looking for
  types to register. The registration methods are literal lists of `services.Add(...)` calls.
- **AOT- and trimming-friendly.** There are no dynamic type lookups for the trimmer to give up
  on.
- **Compile-time errors instead of runtime surprises.** A behavior whose constraints do not
  match, a handler with the wrong return type, or a validator missing its `ValidateProperty`
  method is a build error, not a `NullReferenceException` in production.
- **You can read the output.** The generated pipeline is C# you can step through in a debugger.

The trade-off is that the rules are enforced by analyzers rather than by the type system, so
each package ships a set of diagnostics. Those are documented per package — see, for example,
[Immediate.Handlers diagnostics](/docs/Immediate.Handlers/diagnostics).

## Generated file naming

Each package prefixes its output so you can tell at a glance which generator produced a file.

| Package               | Per-type file                 | Assembly-level file                                                      |
| --------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| Immediate.Handlers    | `IH.<Namespace>.<Class>.g.cs` | `IH.ServiceCollectionExtensions.g.cs`                                    |
| Immediate.Apis        | `IA.<Namespace>.<Class>.g.cs` | `IA.MapEndpoints.g.cs`                                                   |
| Immediate.Validations | `IV.<Name>.g.cs`              | —                                                                        |
| Immediate.Cache       | `IC.<Namespace>.<Class>.g.cs` | `IC.ServiceCollectionExtensions.g.cs`                                    |
| Immediate.Injections  | —                             | `II.ServiceCollectionExtensions.g.cs`, `II.RegisterServicesMethods.g.cs` |
| Immediate.Jobs        | `IJ.<Namespace>.<Class>.g.cs` | `IJ.ServiceCollectionExtensions.g.cs`                                    |

## Inspecting the generated output

Your IDE shows generated files without any project changes. In Visual Studio they are under
**Dependencies → Analyzers**; in Rider, under **Dependencies → Source Generators**.

## Attributes on generated members

Generated types and members may carry these attributes, depending on their purpose:

- `[GeneratedCode("Immediate.Handlers", "<version>")]` — marks the member as machine-written.
  Code-style analyzers and coverage tools skip it, and it records which package version emitted
  it.
- `[EditorBrowsable(EditorBrowsableState.Never)]` — hides the member from IntelliSense. This is
  applied to plumbing you are not expected to call directly, such as the generated
  `HandleBehavior` class and the per-handler `AddHandlers` method. The members you _are_ meant to
  use, like `GetUsersQuery.Handler`, are not hidden.

A member being hidden does not make it inaccessible — it is still `public` — but it is a strong
hint that reaching for it means you have taken a wrong turn.

## Roslyn versions

Each package ships two builds of its generator and analyzers:

| Roslyn | Used by        |
| ------ | -------------- |
| 4.8    | net8.0, net9.0 |
| 5.0    | net10.0        |

NuGet picks the right one from the target framework, so there is nothing to configure. The
consequence worth knowing is that generator behavior can differ slightly across target
frameworks in a multi-targeted project, because two different generator builds are running.

Immediate.Jobs is the preview exception and currently ships framework-specific analyzer builds:

| Jobs target | Roslyn |
| ----------- | ------ |
| net8.0      | 4.11   |
| net9.0      | 4.12   |
| net10.0     | 5.0    |
| net11.0     | 5.3    |

Its per-job `IJ` output includes the typed scheduler, direct invoker and generated JSON metadata;
the assembly output adds `AddXxxJobs()`.
