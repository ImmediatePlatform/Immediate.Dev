---
title: Installation
description: Install the ImmediatePlatform packages, and understand which ones depend on which.
order: 2
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Every package is a NuGet package containing a source generator and analyzers. There is nothing
to configure beyond the package reference and one registration call.

## Install

```bash title="terminal"
# The core. Everything else builds on it.
dotnet add package Immediate.Handlers

# Add whichever of these you need:
dotnet add package Immediate.Validations
dotnet add package Immediate.Apis
dotnet add package Immediate.Cache

# Preview: available when the first Immediate.Jobs packages are published.
dotnet add package Immediate.Jobs --prerelease

# Independent of the above:
dotnet add package Immediate.Injections
```

## The dependency graph

```text
                    Immediate.Handlers
                  ▲       ▲       ▲       ▲
                  │       │       │       │
   Immediate.Validations  │  Immediate.Cache  Immediate.Jobs (preview)
                          │
                    Immediate.Apis

   Immediate.Injections   (independent — see the note below)
```

- **Immediate.Handlers** is the core and depends on nothing but
  `Microsoft.Extensions.DependencyInjection.Abstractions`.
- **Immediate.Validations**, **Immediate.Apis**, **Immediate.Cache** and **Immediate.Jobs** each take a package
  reference on Immediate.Handlers, so it arrives transitively. Installing it explicitly as well
  is harmless and makes the intent clearer.
- **Immediate.Apis** additionally requires ASP.NET Core — use the `Microsoft.NET.Sdk.Web` SDK.
- **Immediate.Cache** requires `IMemoryCache`, registered with `services.AddMemoryCache()`.
- **Immediate.Jobs** runs as a hosted service. It defaults to non-durable in-memory storage; add
  a provider package and configuration for production.
- **Immediate.Injections** requires none of the others.

## Registration

Each package generates one assembly-level method, named after your assembly:

```csharp title="Program.cs"
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyAppHandlers();   // Immediate.Handlers
builder.Services.AddMemoryCache();     // required by Immediate.Cache
builder.Services.AddMyAppCaches();     // Immediate.Cache
builder.Services.AddMyAppServices();   // Immediate.Injections
builder.Services.AddMyAppJobs();       // Immediate.Jobs (preview)

var app = builder.Build();

app.MapMyAppEndpoints();               // Immediate.Apis

app.Run();
```

The `MyApp` part is derived from your assembly name and can be overridden — see
[The assembly identifier](/docs/concepts/assembly-identifier). Immediate.Validations has no
registration method of its own; you add its `ValidationBehavior<,>` to your assembly-wide
`[Behaviors]` list instead.

## Supported target frameworks

The released packages multi-target **net8.0, net9.0 and net10.0**. The Immediate.Jobs preview
tracks current `main` and targets **net8.0 through net11.0**.

## Immediate.Jobs companion packages

These commands become usable with the first preview publication:

```bash
dotnet add package Immediate.Jobs.EntityFrameworkCore --prerelease
dotnet add package Immediate.Jobs.LinqToDB --prerelease
dotnet add package Immediate.Jobs.Redis --prerelease
dotnet add package Immediate.Jobs.Dashboard --prerelease
dotnet add package Immediate.Jobs.NodaTime --prerelease
dotnet add package Immediate.Jobs.Testing --prerelease
```

EF Core and LinqToDB provide full SQL-backed workflows; Redis provides distributed queues and
recurring schedules without batch graphs or fair queues. Dashboard requires ASP.NET Core.

<Callout type="note" title="C# 13 changes one generated signature">
The <code>tags</code> parameter on the generated registration methods is emitted as
<code>params ReadOnlySpan&lt;string&gt;</code> on C# 13 and later and as
<code>params string[]</code> on C# 12 and earlier. Call sites are identical either way. See
<a href="/docs/concepts/tags">Tags and conditional registration</a>.
</Callout>

For the full matrix, including which packages require which companions, see
[Package compatibility](/docs/concepts/package-compatibility).

## Verifying the install

Build once, then inspect the generated code in your IDE. In Visual Studio, expand
**Dependencies → Analyzers**; in Rider, expand **Dependencies → Source Generators**. See
[How source generation works](/docs/concepts/source-generation) for the generated file names.

## Next

Head to the [Quickstart](/docs/getting-started/quickstart) for a working handler in five minutes,
or start the [tutorial](/docs/getting-started/tutorial/overview) to build a complete Todo API one
package at a time.
