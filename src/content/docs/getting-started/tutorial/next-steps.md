---
title: Where to go next
description: The finished tutorial app, and where to read further on each package.
order: 10
group: Tutorial
---

<script lang="ts">
	import { CardGrid, FileTree, LinkCard } from '$lib/components/docs';
</script>

You now have a Todo API built from five packages, with every registration generated at compile
time and no reflection anywhere in the request path.

<FileTree>

- Todo/
  - Todo.csproj
  - Program.cs
  - TodoRepository.cs
  - Features/
    - GetTodosQuery.cs
    - GetTodoQuery.cs
    - GetTodoQueryCache.cs
    - GetTodo.cs
    - CreateTodoCommand.cs
    - CompleteTodoCommand.cs

</FileTree>

## Concepts worth reading next

These cut across every package, and the per-package guides link into them rather than repeating
them.

<CardGrid cols={2}>
	<LinkCard
		title="Handlers and the behavior pipeline"
		description="Where each package attaches to the request path."
		href="/docs/concepts/handlers-and-behaviors"
	/>
	<LinkCard
		title="How source generation works"
		description="Reading the generated output — the fastest way to debug a DI failure."
		href="/docs/concepts/source-generation"
	/>
	<LinkCard
		title="The assembly identifier"
		description="Where the Todo in AddTodoHandlers comes from, and how to change it."
		href="/docs/concepts/assembly-identifier"
	/>
	<LinkCard
		title="Tags and conditional registration"
		description="Registering one slice of an assembly per host."
		href="/docs/concepts/tags"
	/>
</CardGrid>

## The package deep dives

<CardGrid cols={2}>
	<LinkCard
		title="Immediate.Handlers"
		description="Behaviors, streaming handlers, dependencies and registration."
		href="/docs/Immediate.Handlers/introduction"
	/>
	<LinkCard
		title="Immediate.Validations"
		description="All fifteen built-in validators, custom validators and localization."
		href="/docs/Immediate.Validations/introduction"
	/>
	<LinkCard
		title="Immediate.Apis"
		description="Binding, authorization, route groups and OpenAPI."
		href="/docs/Immediate.Apis/introduction"
	/>
	<LinkCard
		title="Immediate.Cache"
		description="Entry options, TransformValue and the concurrency semantics."
		href="/docs/Immediate.Cache/introduction"
	/>
	<LinkCard
		title="Immediate.Injections"
		description="Keyed services, open generics, factories and proxies."
		href="/docs/Immediate.Injections/introduction"
	/>
	<LinkCard
		title="Immediate.Jobs"
		description="Reflection-free background jobs built on Immediate.Handlers."
		href="/docs/Immediate.Jobs/introduction"
	/>
</CardGrid>

## Things the tutorial left out

- **Behaviors.** The pipeline is the main extension point and the tutorial only used one
  (`ValidationBehavior<,>`). [Creating behaviors](/docs/Immediate.Handlers/creating-behaviors)
  covers ordering, generic constraints and why a behavior sometimes doesn't run.
- **Route groups.** Four endpoints don't need them; forty do. See
  [Route groups](/docs/Immediate.Apis/route-groups).
- **Custom validators.** The built-ins cover a lot, but the extensibility mechanism is
  [Building custom validators](/docs/Immediate.Validations/custom-validators).
- **Diagnostics.** Each package ships a set of analyzer rules; each has a page listing them with
  triggers and available code fixes, so pasting an ID into search lands somewhere useful.

## Worked examples

<CardGrid cols={2}>
	<LinkCard
		title="Cookbook"
		description="Full-stack VSA, Blazor, CLI, pub/sub, and mixing in FluentValidation."
		href="/docs/cookbook/the-cookbook"
	/>
	<LinkCard
		title="Benchmarks"
		description="How the generated pipeline compares against runtime mediators."
		href="/docs/benchmarks/performance-comparisons"
	/>
</CardGrid>
