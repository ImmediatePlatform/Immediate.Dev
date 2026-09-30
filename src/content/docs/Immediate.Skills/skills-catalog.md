---
title: Skills catalog
description: Every Immediate.Skills plugin and skill, with what each one does.
order: 3
---

Each plugin groups the skills for one library. Invoke a skill as `/plugin:skill` in Claude Code or
`$plugin:skill` in Codex, or describe the task and let the agent choose.

## Immediate.Handlers

The `immediate-handlers` plugin: Create, stream, register, and extend Immediate.Handlers request pipelines with focused application-development workflows. See the [Immediate.Handlers docs](/docs/Immediate.Handlers/introduction).

| Skill                                         | What it does                                    |
| --------------------------------------------- | ----------------------------------------------- |
| `immediate-handlers:configure-registration`   | Configure handler lifetimes, subsets, and tags. |
| `immediate-handlers:create-behavior`          | Build ordered Immediate handler behaviors.      |
| `immediate-handlers:create-handler`           | Create commands, queries, and request handlers. |
| `immediate-handlers:create-streaming-handler` | Build streaming handlers and behaviors.         |

## Immediate.Apis

The `immediate-apis` plugin: Create, group, customize, and describe Immediate.Apis endpoints generated from Immediate.Handlers. See the [Immediate.Apis docs](/docs/Immediate.Apis/introduction).

| Skill                               | What it does                                 |
| ----------------------------------- | -------------------------------------------- |
| `immediate-apis:configure-openapi`  | Configure schemas and endpoint descriptions. |
| `immediate-apis:create-endpoint`    | Expose handlers as generated API endpoints.  |
| `immediate-apis:create-route-group` | Group generated endpoints and conventions.   |
| `immediate-apis:customize-endpoint` | Customize endpoint metadata and results.     |

## Immediate.Validations

The `immediate-validations` plugin: Validate request models, create validators, localize messages, and handle failures with Immediate.Validations. See the [Immediate.Validations docs](/docs/Immediate.Validations/introduction).

| Skill                                           | What it does                                 |
| ----------------------------------------------- | -------------------------------------------- |
| `immediate-validations:create-custom-validator` | Build Immediate custom validator attributes. |
| `immediate-validations:handle-failure`          | Translate Immediate validation failures.     |
| `immediate-validations:localize-validation`     | Localize generated validation messages.      |
| `immediate-validations:validate-request`        | Add generated validation to request types.   |

## Immediate.Cache

The `immediate-cache` plugin: Create, configure, invalidate, update, and test Immediate.Cache wrappers around generated handlers. See the [Immediate.Cache docs](/docs/Immediate.Cache/introduction).

| Skill                             | What it does                           |
| --------------------------------- | -------------------------------------- |
| `immediate-cache:cache-handler`   | Add generated caching around handlers. |
| `immediate-cache:configure-entry` | Tune Immediate cache entry behavior.   |
| `immediate-cache:test-cache`      | Test generated caches with real DI.    |

## Immediate.Injections

The `immediate-injections` plugin: Register common, keyed, generic, factory, proxy, and manual services with Immediate.Injections. See the [Immediate.Injections docs](/docs/Immediate.Injections/introduction).

| Skill                                          | What it does                                    |
| ---------------------------------------------- | ----------------------------------------------- |
| `immediate-injections:add-manual-registration` | Extend generated service registration manually. |
| `immediate-injections:create-factory-or-proxy` | Generate factory and proxy registrations.       |
| `immediate-injections:register-keyed-service`  | Generate keyed dependency registrations.        |
| `immediate-injections:register-open-generic`   | Generate open generic registrations.            |
| `immediate-injections:register-service`        | Generate common dependency registrations.       |

## Immediate.Jobs

The `immediate-jobs` plugin: Create, schedule, test, store, compose, and operate Immediate.Jobs with focused application-development workflows. See the [Immediate.Jobs docs](/docs/Immediate.Jobs/introduction).

| Skill                                  | What it does                         |
| -------------------------------------- | ------------------------------------ |
| `immediate-jobs:build-workflow`        | Build batches and job continuations. |
| `immediate-jobs:configure-storage`     | Configure durable job storage.       |
| `immediate-jobs:create-job`            | Create generated background jobs.    |
| `immediate-jobs:create-recurring-job`  | Create recurring job schedules.      |
| `immediate-jobs:operate-jobs`          | Monitor and operate background jobs. |
| `immediate-jobs:schedule-job`          | Schedule delayed background work.    |
| `immediate-jobs:test-job`              | Test jobs deterministically.         |
| `immediate-jobs:test-storage-provider` | Test custom job storage providers.   |

## Immediate Platform

The `immediate-platform` plugin: Team-maintained workflows for using Immediate.Apis, Immediate.Handlers, Immediate.Injections, Immediate.Jobs, and related libraries.

| Skill                                      | What it does                               |
| ------------------------------------------ | ------------------------------------------ |
| `immediate-platform:build-vertical-slice`  | Build complete Immediate vertical slices.  |
| `immediate-platform:configure-host-slices` | Coordinate tagged multi-host registration. |
| `immediate-platform:diagnose-generation`   | Debug generators, analyzers, and DI.       |
