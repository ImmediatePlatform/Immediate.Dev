---
title: Introduction
description: FastEndpoints supports both property injection and constructor injection to make your life easier.
---

# {$frontmatter.title}

ImmediatePlatform offers libraries that make implementing the Vertical Slice Architecture, CQRS pattern and Validation in .NET easier. You can think of the ImmediatePlatform suite as an alternative to MediatR/Mediator, FluentValidation and ASP.NET Core Minimal APIs/Controllers. Because the suite is made with modularity in mind, all of the libraries are opt-in and can be mixed and matched with other solutions (e.g. ASP.NET Core Controllers + Immediate.Handlers + FluentValidation). Please see our [full cookbook](/docs/) for all integration examples.

Here is a full list of what each library has to offer:

## Immediate.Handlers

- Implementation of the mediator pattern in .NET using source-generation.
- Support for implementing the Command and Query Responsibility Segregation (CQRS) pattern with minimal boilerplate.
- Support for addressing cross-cutting concerns via [behaviors](/docs/Immediate.Handlers/creating-behaviors).
- All pipeline behaviors are determined and the call-tree built at compile-time; meaning that all dependencies are enforced via compile-time safety checks.
- Behaviors and dependencies are obtained via DI at runtime based on compile-time determined dependencies.
- Implementation that does not rely on the [service locator anti-pattern](https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/).

## Immediate.Apis

- Source generator for Minimal APIs for Immediate.Handlers
- Allows for easily mapping handlers to endpoints

## Immediate.Validation

- Source generator for validating Immediate.Handlers handlers parameters
- Built for maximum performance and minimal boilerplate validation
