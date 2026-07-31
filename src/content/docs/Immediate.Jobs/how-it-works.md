---
title: How it works
description: Follow a job from Roslyn discovery through generated code, durable acquisition and scoped execution.
order: 17
group: Reference
---

## Compile-time discovery

The incremental generator discovers classes with `[Job]` and a valid Immediate.Handlers
`[Handler]`. Analyzers validate names, queues, cron and execution settings, the exact
`HandleAsync` shape, context extractor contracts, and whether payload/context types can receive
source-generated JSON metadata.

For each job it emits `IJ.<Namespace>.<Class>.g.cs` containing:

- a scoped nested `Scheduler` deriving from `JobScheduler<TPayload>`;
- an internal singleton `Invoker` that deserializes, restores context and enters the generated
  Immediate.Handlers pipeline;
- a singleton `JobDefinition` factory with stable name, queue and execution policy;
- a generated `JsonSerializerContext`/resolver for payload and context types;
- registrations for the scheduler, invoker, extractors and definition.

At assembly level, `IJ.ServiceCollectionExtensions.g.cs` contains `AddXxxJobs`. It calls the
runtime registration once, registers queue definitions, and conditionally adds jobs selected by
tags. The assembly identifier and tags follow the same conventions as the other platform
generators.

## Enqueue data flow

1. Application code resolves the scoped generated scheduler.
2. The scheduler captures the current trace link and opted-in context extractors.
3. It serializes payload/context with generated metadata, generates an ID, and builds a record with
   stable job/queue names, due time and optional group/batch data.
4. Storage persists that record (or a batch buffers it until atomic commit).
5. The scheduler returns a `JobHandle`; it does not wait for execution.

## Worker data flow

The hosted service initializes storage and recurring definitions, then builds acquisition requests
from queue priority plus node, queue and job capacity. Storage atomically changes eligible due work
to `Active`, assigns a worker/lease and increments attempts. Distributed providers coordinate
this in the shared backend; single-server mode acquires from memory and mirrors ownership to its
durable replica.

For each acquired record the worker creates a consumer activity and logging scope, starts lease
renewal and a linked timeout token, then creates a fresh async DI scope. The generated invoker
deserializes context and payload, restores known slices, assigns `JobDetails` and resolves the
generated handler. The call enters Immediate.Handlers behaviors and ends at the private job method.

Success atomically records completion and any buffered mid-execution continuations. Failure stores
the exception and either schedules a retry or leaves a terminal failure. Settling a graph node
releases eligible children or marks unselected branches `Skipped`. Release and recursive skipping
are committed in the same transaction as the parent's terminal transition.

## Recurring materialization

Code-defined schedules are reconciled at startup. The recurring loop asks storage for due
schedules; the provider atomically materializes a uniquely keyed occurrence and advances its next
run. This keeps multiple distributed nodes from creating the same occurrence. Overlap policy is
evaluated against active occurrences of the same schedule; `Skip` persists a terminal skipped
occurrence so monitoring retains the scheduling decision.

## Generated JSON, trimming and Native AOT

Schedulers and invokers call `IJobSerializer` overloads that receive generated
`JsonTypeInfo<T>`. The generated resolver covers the payload graph and every opted-in context
type, so trimming does not need to preserve reflection-discovered constructors or properties.
Unsupported shapes fail at compile time. The Native AOT sample publishes the same generated path;
custom serializers must honor the metadata overloads to retain this property.

The runtime itself does not scan assemblies or use a service locator to discover jobs. Durable
job names, queue names, extractor keys and serialized contracts are nevertheless versioned data:
deploy changes compatibly or drain/migrate existing records before removing them.
