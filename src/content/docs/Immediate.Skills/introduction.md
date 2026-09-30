---
title: Introduction
description: Agent skills that teach Claude Code, Codex and other coding agents to build with the Immediate.Platform libraries.
order: 1
---

<script lang="ts">
	import { Callout, CardGrid, LinkCard } from '$lib/components/docs';
</script>

Immediate.Skills is a collection of [agent skills](https://agentskills.io) for building
applications with the Immediate.Platform libraries. A skill is a short, focused workflow that a
coding agent loads when a task needs it: create a handler, expose an endpoint, add validation,
register a service, or schedule a background job. The skills follow the same conventions as this
documentation, so an agent writes code the way these pages describe it.

The skills are published from the
[Immediate.Skills repository](https://github.com/ImmediatePlatform/Immediate.Skills) as a plugin
marketplace for **Claude Code** and **Codex**. Both tools read the same skill files.

## Why use them

- **Accurate APIs.** Each skill is written from these docs and updated with the libraries, so the
  agent uses current attribute names, registration methods and options.
- **Consistent structure.** Skills follow the platform's conventions for handler shapes, stable job
  names, tag-filtered registration and tests.
- **Small context.** Only a short description of each skill is always loaded. The full workflow
  and its reference notes load only when a task needs them.
- **Install what you use.** Every library is a separate plugin, so a project that only uses
  Immediate.Handlers and Immediate.Apis installs only those two.

## Plugins

| Plugin                  | Covers                                                                     |
| ----------------------- | -------------------------------------------------------------------------- |
| `immediate-handlers`    | Handlers, streaming handlers, behaviors and registration                   |
| `immediate-apis`        | Endpoints, route groups, endpoint customization and OpenAPI                |
| `immediate-validations` | Request validation, custom validators, failure handling and localization   |
| `immediate-cache`       | Handler caches, cache entry options and cache tests                        |
| `immediate-injections`  | Service, keyed, open generic, factory and proxy registration               |
| `immediate-jobs`        | Jobs, scheduling, recurring jobs, workflows, storage, operations and tests |
| `immediate-platform`    | Work that spans several libraries, such as a complete vertical slice       |

See the [skills catalog](/docs/Immediate.Skills/skills-catalog) for every skill in each plugin.

## How agents use skills

You do not need to name a skill. When you ask for something like "add a query that returns a
user's orders", the agent sees that `immediate-handlers:create-handler` matches and follows it.
To pick a skill yourself, invoke it by name:

- in Claude Code: `/immediate-handlers:create-handler add a GetOrders query`
- in Codex: `$immediate-handlers:create-handler add a GetOrders query`

A skill reads the surrounding code first, makes the change, and finishes by building and testing
it. It reports what it changed and anything it could not verify.

<Callout type="note" title="Skills do not replace the docs">

Skills are short on purpose. For design decisions, trade-offs and full API details, read the
library pages in this documentation; each skill links back to the pages it was written from.

</Callout>

## Next steps

<CardGrid cols={2}>
	<LinkCard title="Install the skills" description="Add the marketplace to Claude Code or Codex and install plugins." href="/docs/Immediate.Skills/installation" />
	<LinkCard title="Skills catalog" description="Every plugin and skill, with what each one does." href="/docs/Immediate.Skills/skills-catalog" />
	<LinkCard title="Contribute a skill" description="Add or update a skill and validate the marketplace." href="/docs/Immediate.Skills/contributing" />
	<LinkCard title="Migrate background jobs" description="Agent prompts for moving from Hangfire, Quartz.NET and others." href="/docs/Immediate.Jobs/migration/overview" />
</CardGrid>
