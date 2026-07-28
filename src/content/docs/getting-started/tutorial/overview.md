---
title: What we're building
description: A tour of the Todo API this tutorial builds, and which package contributes what.
order: 4
group: Tutorial
---

<script lang="ts">
	import { Callout, FileTree } from '$lib/components/docs';
</script>

Over the next six pages you'll build one small application — a Todo API — adding a single
package per page. Each page ends with something you can run, and says what the next page adds.

If you only want to see a handler work, the [Quickstart](/docs/getting-started/quickstart) is
faster. This tutorial is for understanding how the packages fit together.

## What it does

Four endpoints over an in-memory list of todos:

| Method | Route                          | Handler               |
| ------ | ------------------------------ | --------------------- |
| `GET`  | `/api/todos`                   | `GetTodosQuery`       |
| `GET`  | `/api/todos/{id:int}`          | `GetTodoQuery`        |
| `POST` | `/api/todos`                   | `CreateTodoCommand`   |
| `PUT`  | `/api/todos/{id:int}/complete` | `CompleteTodoCommand` |

## What each page adds

| Page                                                                                  | Package               | What you get                                                 |
| ------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------ |
| [Your first handler](/docs/getting-started/tutorial/first-handler)                    | Immediate.Handlers    | `GetTodosQuery`, running from a console entry point          |
| [Adding validation](/docs/getting-started/tutorial/adding-validation)                 | Immediate.Validations | `CreateTodoCommand` rejects bad input before your code runs  |
| [Exposing an HTTP endpoint](/docs/getting-started/tutorial/exposing-endpoints)        | Immediate.Apis        | All four handlers become minimal-API endpoints               |
| [Caching a query](/docs/getting-started/tutorial/caching)                             | Immediate.Cache       | `GetTodoQuery` responses are cached and invalidated on write |
| [Wiring up dependency injection](/docs/getting-started/tutorial/dependency-injection) | Immediate.Injections  | `TodoRepository` registers itself                            |
| [Where to go next](/docs/getting-started/tutorial/next-steps)                         | —                     | Links into the deep dives                                    |

## The finished layout

<FileTree>

- Todo/
  - Todo.csproj
  - Program.cs
  - TodoRepository.cs
  - Features/
    - GetTodosQuery.cs
    - GetTodoQuery.cs
    - GetTodoQueryCache.cs
    - CreateTodoCommand.cs
    - CompleteTodoCommand.cs

</FileTree>

One file per feature, each containing its request type, its response type and its handler. That
grouping is Vertical Slice Architecture, and it's the layout the platform is designed around —
nothing forces it, but everything is easier with it.

## Create the project

```bash title="terminal"
dotnet new web -n Todo
cd Todo
mkdir Features
```

<Callout type="note" title="About the generated method names">
The project is named <code>Todo</code>, so the generated registration methods will be
<code>AddTodoHandlers()</code>, <code>MapTodoEndpoints()</code>, <code>AddTodoCaches()</code> and
<code>AddTodoServices()</code>. That <code>Todo</code> comes from the assembly name and can be
overridden — see <a href="/docs/concepts/assembly-identifier">The assembly identifier</a>. If you
named your project something else, substitute accordingly throughout.
</Callout>

Add the packages now, so you don't have to stop later:

```bash title="terminal"
dotnet add package Immediate.Handlers
dotnet add package Immediate.Validations
dotnet add package Immediate.Apis
dotnet add package Immediate.Cache
dotnet add package Immediate.Injections
```

## Up next

[Your first handler](/docs/getting-started/tutorial/first-handler) — a `[Handler]` class, the
generated `Handler` type, and calling it without any HTTP involved.
