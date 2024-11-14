---
title: Introduction
description: ImmediatePlatform offers libraries that make implementing the Vertical Slice Architecture, CQRS pattern and Validation in .NET easier. You can think of the ImmediatePlatform suite as an alternative to MediatR/Mediator, FluentValidation and ASP.NET Core Minimal APIs/Controllers.
---

# {$frontmatter.title}

<script>
    import GitHubBadge from '$lib/components/GitHubBadge.svelte';
    import GitHubBadgeCollection from '$lib/components/GitHubBadgeCollection.svelte';
</script>

ImmediatePlatform offers libraries that make implementing the Vertical Slice Architecture, CQRS pattern and Validation in .NET easier. You can think of the ImmediatePlatform suite as an alternative to MediatR/Mediator, FluentValidation and ASP.NET Core Minimal APIs/Controllers. Because the suite is made with modularity in mind, all of the libraries are opt-in and can be mixed and matched with other solutions (e.g. ASP.NET Core Controllers + Immediate.Handlers + FluentValidation). Please see our [full cookbook](/docs/cookbook/the-cookbook) for all integration examples.

Here is a full list of what each library has to offer:

## Immediate.Handlers

<GitHubBadgeCollection>
    <GitHubBadge src="https://img.shields.io/badge/github-%23121011.svg?color=grey&logo=github&logoColor=white" href="https://github.com/ImmediatePlatform/Immediate.Handlers/" />
    <GitHubBadge src="https://img.shields.io/nuget/v/Immediate.Handlers.svg" href="https://www.nuget.org/packages/Immediate.Handlers/" alt="Immediate.Handlers NuGet badge" />
    <GitHubBadge src="https://img.shields.io/github/release/ImmediatePlatform/Immediate.Handlers.svg" href="https://GitHub.com/ImmediatePlatform/Immediate.Handlers/releases/" alt="Immediate.Handlers GitHub Release badge" />
    <GitHubBadge src="https://img.shields.io/github/license/ImmediatePlatform/Immediate.Handlers.svg" href="https://github.com/ImmediatePlatform/Immediate.Handlers/blob/master/license.txt" alt="Immediate.Handlers MIT license badge" />
</GitHubBadgeCollection>

- Implementation of the mediator pattern in .NET using source-generation.
- Support for implementing the Command and Query Responsibility Segregation (CQRS) pattern with minimal boilerplate.
- Support for addressing cross-cutting concerns via [behaviors](/docs/Immediate.Handlers/creating-behaviors).
- All pipeline behaviors are determined and the call-tree built at compile-time; meaning that all dependencies are enforced via compile-time safety checks.
- Behaviors and dependencies are obtained via DI at runtime based on compile-time determined dependencies.
- Implementation that does not rely on the [service locator anti-pattern](https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/).

## Immediate.Apis

<GitHubBadgeCollection>
    <GitHubBadge src="https://img.shields.io/badge/github-%23121011.svg?color=grey&logo=github&logoColor=white" href="https://github.com/ImmediatePlatform/Immediate.Apis/" />
    <GitHubBadge src="https://img.shields.io/nuget/v/Immediate.Apis.svg" href="https://www.nuget.org/packages/Immediate.Apis/" alt="Immediate.Apis NuGet badge" />
    <GitHubBadge src="https://img.shields.io/github/release/ImmediatePlatform/Immediate.Apis.svg" href="https://GitHub.com/ImmediatePlatform/Immediate.Apis/releases/" alt="Immediate.Apis GitHub Release badge" />
    <GitHubBadge src="https://img.shields.io/github/license/ImmediatePlatform/Immediate.Apis.svg" href="https://github.com/ImmediatePlatform/Immediate.Apis/blob/master/license.txt" alt="Immediate.Apis MIT license badge" />
</GitHubBadgeCollection>

- Source generator for Minimal APIs for Immediate.Handlers
- Allows for easily mapping handlers to endpoints

## Immediate.Validations

<GitHubBadgeCollection>
    <GitHubBadge src="https://img.shields.io/badge/github-%23121011.svg?color=grey&logo=github&logoColor=white" href="https://github.com/ImmediatePlatform/Immediate.Validations/" />
    <GitHubBadge src="https://img.shields.io/nuget/v/Immediate.Validations.svg" href="https://www.nuget.org/packages/Immediate.Validations/" alt="Immediate.Validations NuGet badge" />
    <GitHubBadge src="https://img.shields.io/github/release/ImmediatePlatform/Immediate.Validations.svg" href="https://GitHub.com/ImmediatePlatform/Immediate.Validations/releases/" alt="Immediate.Validations GitHub Release badge" />
    <GitHubBadge src="https://img.shields.io/github/license/ImmediatePlatform/Immediate.Validations.svg" href="https://github.com/ImmediatePlatform/Immediate.Validations/blob/master/license.txt" alt="Immediate.Validations MIT license badge" />
</GitHubBadgeCollection>

- Source generator for validating Immediate.Handlers handlers parameters
- Built for maximum performance and minimal boilerplate validation

## Immediate.Cache

<GitHubBadgeCollection>
    <GitHubBadge src="https://img.shields.io/badge/github-%23121011.svg?color=grey&logo=github&logoColor=white" href="https://github.com/ImmediatePlatform/Immediate.Cache/" />
    <GitHubBadge src="https://img.shields.io/nuget/v/Immediate.Cache.svg" href="https://www.nuget.org/packages/Immediate.Cache/" alt="Immediate.Cache NuGet badge" />
    <GitHubBadge src="https://img.shields.io/github/release/ImmediatePlatform/Immediate.Cache.svg" href="https://GitHub.com/ImmediatePlatform/Immediate.Cache/releases/" alt="Immediate.Cache GitHub Release badge" />
    <GitHubBadge src="https://img.shields.io/github/license/ImmediatePlatform/Immediate.Cache.svg" href="https://github.com/ImmediatePlatform/Immediate.Cache/blob/master/license.txt" alt="Immediate.Cache MIT license badge" />
</GitHubBadgeCollection>

- Collection of classes that simplify caching responses from Immediate.Handlers handlers.
