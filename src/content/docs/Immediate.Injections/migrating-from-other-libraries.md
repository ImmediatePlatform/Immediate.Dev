---
title: Migrating from other libraries
description: Mapping Injectio and AutoRegisterInject attributes and defaults onto Immediate.Injections.
order: 10
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Both libraries below register services from attributes, so the mechanical translation is small.
The part that bites is the **default registration strategy**: Immediate.Injections defaults to
registering a class as itself, where the others do not. Set an assembly default first, then port
the attributes.

## From Injectio

<Callout type="note" title="Set this first">
Injectio's default is "self and interfaces, sharing one instance". Reproduce it with
<code>[assembly: RegistrationDefaults(RegistrationStrategy = RegistrationStrategy.SelfAndImplementedInterfaces, UseProxyFactory = true)]</code>
before you touch anything else. Without <code>UseProxyFactory</code> you get one instance per
service type instead of one shared instance.
</Callout>

```csharp title="AssemblyInfo.cs"
using Immediate.Injections.Shared;

[assembly: RegistrationDefaults(
	RegistrationStrategy = RegistrationStrategy.SelfAndImplementedInterfaces,
	UseProxyFactory = true
)]
```

| Injectio                                                         | Immediate.Injections                                |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| `[RegisterSingleton]`, `[RegisterScoped]`, `[RegisterTransient]` | Same names                                          |
| `Registration = ...`                                             | `RegistrationStrategy = ...`                        |
| `RegistrationStrategy.SelfWithInterfaces`                        | `RegistrationStrategy.SelfAndImplementedInterfaces` |
| `Duplicate = ...`                                                | `DuplicateStrategy = ...`                           |
| `Tags = "foo,bar"` (comma-separated string)                      | `Tags = ["foo", "bar"]` (string array)              |
| Assembly-name override via MSBuild property                      | `[assembly: ImmediateAssemblyIdentifier("Name")]`   |

The tag change is the one to grep for — `Tags = "foo,bar"` will not compile against a
`string[]?` property, so the compiler finds them all for you.

<Callout type="warning">
<code>[ImmediateAssemblyIdentifier]</code> is defined in the <strong>Immediate.Handlers</strong>
package, not this one. If you are not also using Immediate.Handlers you must either add a
reference to it or declare a matching type yourself — see
<a href="/docs/concepts/assembly-identifier">The assembly identifier</a>.
</Callout>

## From AutoRegisterInject

<Callout type="note" title="Set this first">
AutoRegisterInject registers a class against its interfaces, not against itself. Reproduce that
with
<code>[assembly: RegistrationDefaults(RegistrationStrategy = RegistrationStrategy.ImplementedInterfaces)]</code>.
</Callout>

```csharp title="AssemblyInfo.cs"
using Immediate.Injections.Shared;

[assembly: RegistrationDefaults(
	RegistrationStrategy = RegistrationStrategy.ImplementedInterfaces
)]
```

| AutoRegisterInject                                               | Immediate.Injections                                              |
| ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| `[RegisterSingleton]`, `[RegisterScoped]`, `[RegisterTransient]` | Same names                                                        |
| `[TryRegisterSingleton]` and friends                             | `[RegisterSingleton(DuplicateStrategy = DuplicateStrategy.Skip)]` |

The `TryRegisterXxx` family has no equivalent attribute; the "only register if absent" behavior
is now a property, so a `[TryRegisterScoped<IService>]` becomes:

```csharp
[RegisterScoped<IService>(DuplicateStrategy = DuplicateStrategy.Skip)]
```

If most of your registrations were `TryRegisterXxx`, set the assembly default instead and drop
the property from each attribute:

```csharp
[assembly: RegistrationDefaults(
	RegistrationStrategy = RegistrationStrategy.ImplementedInterfaces,
	DuplicateStrategy = DuplicateStrategy.Skip
)]
```

## After either migration

- Replace the old library's startup call with the generated
  [`AddXxxServices()`](/docs/Immediate.Injections/registering-services#calling-the-generated-method).
- Build once and read the diagnostics. INJ0003–INJ0012 catch most translation mistakes at
  compile time; see [Diagnostics](/docs/Immediate.Injections/diagnostics).
- Registrations that silently vanish rather than erroring are almost always a generic class with
  a `Factory` or `UseProxyFactory` — see [Open generics](/docs/Immediate.Injections/open-generics).
