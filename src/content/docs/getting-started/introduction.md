---
title: Introduction
description: ImmediatePlatform is a suite of source-generated .NET libraries for Vertical Slice Architecture, CQRS, validation, minimal APIs, caching and dependency injection.
order: 1
---

<script lang="ts">
	import { Callout, PackageBadges } from '$lib/components/docs';
</script>

ImmediatePlatform offers libraries that make implementing the Vertical Slice Architecture, CQRS
pattern and Validation in .NET easier. You can think of the ImmediatePlatform suite as an
alternative to MediatR/Mediator, FluentValidation and ASP.NET Core Minimal APIs/Controllers.

## What "source generated" buys you

Every package in the suite is a Roslyn source generator. None of them scan assemblies, build
expression trees, or look types up by name at runtime — they read your code at compile time and
write ordinary C# next to it. That has four practical consequences:

- **No reflection and no startup scanning.** The generated registration methods are literal
  lists of `services.Add(...)` calls. Startup cost is the cost of running them.
- **AOT- and trimming-friendly.** There are no dynamic type lookups for the trimmer to fail on.
- **Mistakes are build errors.** A behavior whose constraints don't match, a handler with the
  wrong return type, a validator missing a required method — all of these fail the build with a
  specific diagnostic instead of surfacing at runtime.
- **You can read and debug the output.** The generated pipeline is C# you can step through.

See [How source generation works](/docs/concepts/source-generation) for the details, including
how to inspect the generated files.

## You don't have to adopt all of it

The libraries are opt-in and mix freely with things you already use. All of these are supported
combinations:

- Immediate.Handlers behind ASP.NET Core Controllers, with no Immediate.Apis
- Immediate.Handlers + FluentValidation, with no Immediate.Validations
- Immediate.Injections alone, with no mediator anywhere in the project
- Immediate.Apis + Immediate.Handlers + DataAnnotations

Please see our [full cookbook](/docs/cookbook/the-cookbook) for all integration examples.

## Which package do I want?

| I want to…                                                  | Package                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Decouple callers from handlers without a runtime mediator   | [Immediate.Handlers](/docs/Immediate.Handlers/introduction)                            |
| Add logging, telemetry or transactions around every request | [Immediate.Handlers](/docs/Immediate.Handlers/creating-behaviors) — behaviors          |
| Stream results back as they are produced                    | [Immediate.Handlers](/docs/Immediate.Handlers/streaming-handlers) — streaming handlers |
| Validate requests without writing validator classes by hand | [Immediate.Validations](/docs/Immediate.Validations/introduction)                      |
| Turn a handler into an HTTP endpoint                        | [Immediate.Apis](/docs/Immediate.Apis/introduction)                                    |
| Cache a query's response in memory                          | [Immediate.Cache](/docs/Immediate.Cache/introduction)                                  |
| Register ordinary services with DI by attribute             | [Immediate.Injections](/docs/Immediate.Injections/introduction)                        |
| Run work in the background on a schedule                    | [Immediate.Jobs](/docs/Immediate.Jobs/introduction)                                    |

## The libraries

### Immediate.Handlers

<PackageBadges name="Immediate.Handlers" />

- Implementation of the mediator pattern in .NET using source-generation.
- Support for implementing the Command and Query Responsibility Segregation (CQRS) pattern with minimal boilerplate.
- Support for addressing cross-cutting concerns via [behaviors](/docs/Immediate.Handlers/creating-behaviors).
- All pipeline behaviors are determined and the call-tree built at compile-time; meaning that all dependencies are enforced via compile-time safety checks.
- Behaviors and dependencies are obtained via DI at runtime based on compile-time determined dependencies.
- Implementation that does not rely on the [service locator anti-pattern](https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/).

### Immediate.Apis

<PackageBadges name="Immediate.Apis" />

- Source generator for Minimal APIs for Immediate.Handlers
- Allows for easily mapping handlers to endpoints, individually or in [route groups](/docs/Immediate.Apis/route-groups)

### Immediate.Validations

<PackageBadges name="Immediate.Validations" />

- Source generator for validating Immediate.Handlers handlers parameters
- Built for maximum performance and minimal boilerplate validation
- A [library of built-in validators](/docs/Immediate.Validations/built-in-validators), plus [your own](/docs/Immediate.Validations/custom-validators)

### Immediate.Cache

<PackageBadges name="Immediate.Cache" />

- Collection of classes that simplify caching responses from Immediate.Handlers handlers.
- Backed by `IMemoryCache`; concurrent requests for one key coalesce onto a single handler execution.

### Immediate.Injections

<PackageBadges name="Immediate.Injections" />

- Source generator for registering non-IH handler classes with MSDI.
- Supports keyed services, open generics, factories and proxies.

### Immediate.Jobs

<PackageBadges name="Immediate.Jobs" nuget={false} release={false} license={false} />

- Reflection-free background job scheduler for .NET built on Immediate.Handlers.
- Generates typed schedulers, payload metadata, and dependency-injection registrations at compile time.
- See the [Immediate.Jobs manual](/docs/Immediate.Jobs/introduction) for scheduling, workflows,
  storage, operations and testing.

<Callout type="tip" title="Where to next">
<a href="/docs/getting-started/installation">Installation</a> covers the packages and how they
depend on each other. The <a href="/docs/getting-started/quickstart">Quickstart</a> gets one
handler running. The <a href="/docs/getting-started/tutorial/overview">tutorial</a> builds a
complete Todo API, adding one package per page.
</Callout>
