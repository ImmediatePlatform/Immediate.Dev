---
title: Introduction
description: ImmediatePlatform offers libraries that make implementing the Vertical Slice Architecture, CQRS pattern and Validation in .NET easier. You can think of the ImmediatePlatform suite as an alternative to MediatR/Mediator, FluentValidation and ASP.NET Core Minimal APIs/Controllers.
order: 1
---

<script lang="ts">
	import { PackageBadges } from '$lib/components/docs';
</script>

ImmediatePlatform offers libraries that make implementing the Vertical Slice Architecture, CQRS pattern and Validation in .NET easier. You can think of the ImmediatePlatform suite as an alternative to MediatR/Mediator, FluentValidation and ASP.NET Core Minimal APIs/Controllers. Because the suite is made with modularity in mind, all of the libraries are opt-in and can be mixed and matched with other solutions (e.g. ASP.NET Core Controllers + Immediate.Handlers + FluentValidation). Please see our [full cookbook](/docs/cookbook/the-cookbook) for all integration examples.

Here is a full list of what each library has to offer:

## Immediate.Handlers

<PackageBadges name="Immediate.Handlers" />

- Implementation of the mediator pattern in .NET using source-generation.
- Support for implementing the Command and Query Responsibility Segregation (CQRS) pattern with minimal boilerplate.
- Support for addressing cross-cutting concerns via [behaviors](/docs/Immediate.Handlers/creating-behaviors).
- All pipeline behaviors are determined and the call-tree built at compile-time; meaning that all dependencies are enforced via compile-time safety checks.
- Behaviors and dependencies are obtained via DI at runtime based on compile-time determined dependencies.
- Implementation that does not rely on the [service locator anti-pattern](https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/).

## Immediate.Apis

<PackageBadges name="Immediate.Apis" />

- Source generator for Minimal APIs for Immediate.Handlers
- Allows for easily mapping handlers to endpoints

## Immediate.Validations

<PackageBadges name="Immediate.Validations" />

- Source generator for validating Immediate.Handlers handlers parameters
- Built for maximum performance and minimal boilerplate validation

## Immediate.Cache

<PackageBadges name="Immediate.Cache" />

- Collection of classes that simplify caching responses from Immediate.Handlers handlers.

## Immediate.Injections

<PackageBadges name="Immediate.Injections" />

- Source generator for registering non-IH handler classes with MSDI.

## Immediate.Jobs

<PackageBadges name="Immediate.Jobs" nuget={false} release={false} license={false} />

- Reflection-free background job scheduler for .NET built on Immediate.Handlers.
- Generates typed schedulers, payload metadata, and dependency-injection registrations at compile time.
- See the [Immediate.Jobs introduction](/docs/Immediate.Jobs/introduction) while the complete package documentation is migrated.
