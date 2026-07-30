---
title: Introduction
description: Source-generated Microsoft.Extensions.DependencyInjection registrations declared with attributes.
order: 1
---

<script lang="ts">
	import { CardGrid, LinkCard, PackageBadges } from '$lib/components/docs';
</script>

<PackageBadges name="Immediate.Injections" />

Immediate.Injections turns attributes on your classes into ordinary
`Microsoft.Extensions.DependencyInjection` registration calls, written at compile time. You mark
a class with a lifetime attribute, call one generated extension method at startup, and the
container is wired — no assembly scanning, no reflection, no convention magic to debug.

## Installation

```bash
dotnet add package Immediate.Injections
```

The package ships the attributes, the generator and the analyzers together. Nothing else is
required at runtime beyond `Microsoft.Extensions.DependencyInjection.Abstractions`, which comes
with the package.

Supported target frameworks are `net8.0`, `net9.0` and `net10.0`. See
[Package compatibility](/docs/concepts/package-compatibility) for the full matrix.

## Prerequisites

Unlike Immediate.Apis, Immediate.Cache and Immediate.Validations, this package does **not**
require Immediate.Handlers. It is a standalone dependency-injection helper and can be used in a
project that has no other ImmediatePlatform package installed.

## A minimal example

```csharp title="Repository.cs"
using Immediate.Injections.Shared;

public interface ITodoRepository
{
	Task<Todo?> GetAsync(int id);
}

[RegisterScoped<ITodoRepository>]
public sealed class TodoRepository(TodoDbContext context) : ITodoRepository
{
	public Task<Todo?> GetAsync(int id) =>
		context.Todos.FirstOrDefaultAsync(t => t.Id == id);
}
```

```csharp title="Program.cs"
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddTodoServices();
```

`AddTodoServices` is generated. The `Todo` in the middle is the assembly identifier — by default
the assembly name with `.`, spaces and `-` removed, so a project named `Todo` gets
`AddTodoServices` and a project named `Todo.Web` gets `AddTodoWebServices`.

The generated body is a literal list of `ServiceDescriptor` calls:

```csharp title="Generated output"
global::Microsoft.Extensions.DependencyInjection.Extensions.ServiceCollectionDescriptorExtensions.Add(
	services,
	global::Microsoft.Extensions.DependencyInjection.ServiceDescriptor.Scoped(
		typeof(global::ITodoRepository),
		typeof(global::TodoRepository)
	)
);
```

## Where to go next

<CardGrid cols={2}>
	<LinkCard
		title="Registering services"
		description="The three lifetime attributes, their three forms, and the generated extension method."
		href="/docs/Immediate.Injections/registering-services" />
	<LinkCard
		title="Registration strategies"
		description="ServiceType vs RegistrationStrategy, and how duplicates are handled."
		href="/docs/Immediate.Injections/registration-strategies" />
	<LinkCard
		title="Keyed services"
		description="Register and resolve services under a key."
		href="/docs/Immediate.Injections/keyed-services" />
	<LinkCard
		title="Open generics"
		description="Register a generic class as an open generic and let the container close it."
		href="/docs/Immediate.Injections/open-generics" />
	<LinkCard
		title="Factories and proxies"
		description="Custom construction, and sharing one instance across a type and its interfaces."
		href="/docs/Immediate.Injections/factories-and-proxies" />
	<LinkCard
		title="Manual registration"
		description="Hook hand-written registration code into the generated method."
		href="/docs/Immediate.Injections/manual-registration" />
	<LinkCard
		title="Attributes reference"
		description="Every attribute property and both enums, in one table."
		href="/docs/Immediate.Injections/attributes-reference" />
	<LinkCard
		title="Diagnostics"
		description="INJ0001–INJ0012, what triggers each and how to fix it."
		href="/docs/Immediate.Injections/diagnostics" />
</CardGrid>
