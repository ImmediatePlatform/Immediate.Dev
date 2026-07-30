---
title: How it works
description: The files Immediate.Injections generates, the partial-method structure of AddXxxServices, and the language-version shim.
order: 12
group: Reference
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Injections is an incremental Roslyn source generator. It reads your attributes at
compile time and writes plain `ServiceDescriptor` calls — there is no runtime component, no
assembly scanning and nothing to configure. For the platform-wide picture, see
[How source generation works](/docs/concepts/source-generation).

<Callout type="note">

The generator fully qualifies type names with <code>global::</code>. Those prefixes are omitted
from the listings below for readability.

</Callout>

## The generated files

Every file is prefixed `II.` so you can tell at a glance which generator produced it.

| File                                                                                     | Emitted when                                                                  |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `II.ServiceCollectionExtensions.g.cs`                                                    | Always, in every project that references the package                          |
| ``II.RegisterScoped`0.g.cs``, ``II.RegisterScoped`1.g.cs``, ``II.RegisterScoped`2.g.cs`` | That lifetime has at least one registration from the matching attribute arity |
| The `RegisterSingleton` and `RegisterTransient` equivalents                              | Likewise                                                                      |
| `II.RegisterServicesMethods.g.cs`                                                        | The assembly has at least one valid `[RegisterServices]` method               |

The backtick number is the attribute's arity: `` `0 `` for `[RegisterScoped]`, `` `1 `` for
`[RegisterScoped<TService>]`, `` `2 `` for `[RegisterScoped<TService, TImplementation>]`. Eleven
files is the theoretical maximum; two or three is typical.

Unlike the other ImmediatePlatform packages, this one emits nothing per type — a class with a
registration attribute gets no file of its own, only a line inside the shared lifetime file.

To read them, add:

```xml title="MyApp.csproj"
<PropertyGroup>
	<EmitCompilerGeneratedFiles>true</EmitCompilerGeneratedFiles>
	<CompilerGeneratedFilesOutputPath>$(BaseIntermediateOutputPath)generated</CompilerGeneratedFilesOutputPath>
</PropertyGroup>
```

## `AddXxxServices` and the partial-method structure

The entry point is one `public static partial class RegistrationServiceCollectionExtensions`,
declared in your project's root namespace (from the `RootNamespace` MSBuild property; omitted
entirely if that is empty). `II.ServiceCollectionExtensions.g.cs` declares the public method and
ten `static partial void` hooks:

```csharp title="II.ServiceCollectionExtensions.g.cs"
[GeneratedCode("Immediate.Injections", "…")]
public static partial class RegistrationServiceCollectionExtensions
{
	public static IServiceCollection AddTodoServices(
		this IServiceCollection services,
		params ReadOnlySpan<string> tags
	)
	{
		services.RegisterScoped(tags);
		services.RegisterScoped1(tags);
		services.RegisterScoped2(tags);

		services.RegisterSingleton(tags);
		services.RegisterSingleton1(tags);
		services.RegisterSingleton2(tags);

		services.RegisterTransient(tags);
		services.RegisterTransient1(tags);
		services.RegisterTransient2(tags);

		services.RegisterServices(tags);

		return services;
	}

	static partial void RegisterScoped(this IServiceCollection services, ReadOnlySpan<string> tags);
	// … nine more declarations …
}
```

Each of the other generated files supplies the implementation of one of those partials, as
another part of the same class. A partial method with no implementation compiles to nothing, so
the calls for lifetimes you do not use disappear entirely.

Two consequences worth knowing:

- **Ordering is fixed.** All scoped registrations run before all singleton ones, which run
  before all transient ones; within a lifetime, arity 0 before 1 before 2. This matters when you
  use `DuplicateStrategy.Skip` or `Replace`, because "already registered" is evaluated in that
  order.
- **`[RegisterServices]` methods run last**, after every attribute-driven registration.

## What a registration looks like

Fully qualified, with no `using` directives, so nothing in your code can shadow it:

```csharp title="Generated output"
static partial void RegisterScoped1(this IServiceCollection services, ReadOnlySpan<string> tags)
{
	Microsoft.Extensions.DependencyInjection.Extensions.ServiceCollectionDescriptorExtensions.Add(
		services,
		Microsoft.Extensions.DependencyInjection.ServiceDescriptor.Scoped(
			typeof(Todo.ITodoRepository),
			typeof(Todo.TodoRepository)
		)
	);
}
```

The pieces map one-to-one onto attribute properties:

| Generated element                                                  | Comes from                                                                                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `ServiceCollectionDescriptorExtensions.Add` / `TryAdd` / `Replace` | `DuplicateStrategy`                                                                                                          |
| `ServiceDescriptor.Scoped` / `KeyedScoped` / …                     | The lifetime attribute, plus `ServiceKey`                                                                                    |
| First `typeof(...)`                                                | `ServiceType`, `TService`, or the computed `RegistrationStrategy` set                                                        |
| Second argument                                                    | `typeof(implementation)`, `<AttributedType>.<FactoryMethod>` for `Factory`, or `GetRequiredService<T>` for `UseProxyFactory` |
| The enclosing `if (tags is [] ...)` guard                          | `Tags`                                                                                                                       |

## Tag filtering

Registrations are grouped by their tag set and each group gets one guard:

```csharp
if (tags is [] || Intersects(tags, ["worker", "background"]))
{
	// registrations carrying exactly that tag set
}
```

`Intersects` is a private helper in the same generated class — a nested loop over the two spans
using ordinal string comparison. Untagged registrations are emitted with no guard, which is why
they are always applied. The tag list is sorted when grouping, so `["a", "b"]` and `["b", "a"]`
are the same group.

## The language-version shim

The `tags` parameter of the public method adapts to your project's C# language version:

| Language version  | Signature                     |
| ----------------- | ----------------------------- |
| C# 13 and later   | `params ReadOnlySpan<string>` |
| C# 12 and earlier | `params string[]`             |

`params` collections require C# 13, so the span form cannot be emitted on older language
versions. Both are `params`, so `AddTodoServices("web")` compiles identically either way. The
private partial methods always take a `ReadOnlySpan<string>`, which is legal on all supported
frameworks; only the `params` modifier is version-sensitive.

## Assembly identifier

`Xxx` in `AddXxxServices` comes from `[assembly: ImmediateAssemblyIdentifier("Xxx")]` if present
and valid, otherwise from the assembly name with `.` and spaces removed and the result trimmed.

## Roslyn and target frameworks

The package ships two builds of the generator and analyzers: Roslyn 4.8 for `net8.0` and
`net9.0`, and Roslyn 5.0 for `net10.0`. The right one is selected by your target
framework automatically.

The attributes themselves live in a small `Immediate.Injections.Shared` assembly that ships
inside the package, so the attributes are real referenced types — not source injected into your
compilation.

## Where to go next

- [How source generation works](/docs/concepts/source-generation)
- [Attributes reference](/docs/Immediate.Injections/attributes-reference)
- [Diagnostics](/docs/Immediate.Injections/diagnostics)
