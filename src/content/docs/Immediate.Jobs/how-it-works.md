---
title: How it works
description: See how Immediate.Jobs finds, saves and runs a job.
order: 17
group: Reference
---

## Compile-time discovery

The incremental generator discovers classes with `[Job]` and a valid Immediate.Handlers
`[Handler]`. Analyzers validate names, queues, cron and execution settings, the exact
`HandleAsync` shape, context extractors and whether generated JSON can represent the payload and
context types.

For each job it emits `IJ.<Namespace>.<Class>.g.cs` containing:

- a scoped nested `Scheduler` deriving from `JobScheduler<TPayload>`;
- an internal singleton `Invoker` that restores saved data and calls the Immediate.Handlers
  pipeline;
- a singleton `JobDefinition` factory with stable name, queue and execution policy;
- a generated `JsonSerializerContext`/resolver for payload and context types;
- registrations for the scheduler, invoker, extractors and definition.

At assembly level, `IJ.ServiceCollectionExtensions.g.cs` contains `AddXxxJobs`, placed in the
project's `RootNamespace`. It registers the selected jobs and returns `IImmediateJobsBuilder`. Queue
settings travel with each job definition, so no separate queue registration is generated. Calling
the registration method again does not duplicate jobs or the hosted worker. The assembly identifier and tags follow the same conventions as the other platform
generators.

## Enqueue data flow

1. Application code resolves the scoped generated scheduler.
2. The scheduler captures the current trace link and any selected context values.
3. It serializes the payload and context, creates an ID, and builds a record with the job name,
   queue, due time and optional group or batch data.
4. Storage saves that record. An open batch holds it in memory until commit.
5. The scheduler returns a `JobHandle`; it does not wait for execution.

## Worker data flow

The hosted service prepares storage and recurring schedules, then runs separate loops for
acquisition, lease renewal and heartbeats alongside `WorkerCount` workers. The acquisition loop
asks storage for due jobs based on queue priority and the available capacity for the node
(`MaxAcquisitionCount`), queue and job, then hands them to the workers through an in-memory
channel. Storage marks each
selected job `Active`, assigns its worker and lease, increments its attempt number and saves an
execution record. It makes those changes in one operation.

Distributed mode coordinates workers through shared storage. Single-server mode selects jobs in
memory and copies each claim to durable storage.

For each selected job, the worker starts tracing, logging and its timeout, while the lease-renewal
loop keeps the job's lease current. It also
creates a new dependency injection scope. The generated invoker restores the payload and context,
sets `JobDetails`, resolves the handler and runs its Immediate.Handlers behaviors.

On success, Jobs closes the attempt and saves any follow-up jobs that the handler buffered. On
failure, it saves the full exception and either schedules a retry or leaves the job failed. Every
update includes the attempt number and worker ID. An old worker therefore cannot overwrite a job
that another worker acquired or a user cancelled.

When a batch job finishes, storage starts eligible child jobs and marks other branches `Skipped`.
It saves these changes together with the parent's result.

## Recurring runs

At startup, Jobs merges the code-defined schedules into storage in one operation. On each
acquisition pass it then checks for schedules that are due and applies the job's
`MisfireHandlingMode` to any occurrences that were missed. Storage creates each run and advances
the schedule in the same operation, which prevents two workers from creating the same run. If the
overlap policy is `Skip`, Jobs still saves a skipped run so monitoring shows what happened. With
`Queue`, the new run is saved as a continuation of the latest unfinished run.

## Generated JSON, trimming and Native AOT

Schedulers and invokers call `IJobSerializer` overloads that receive generated
`JsonTypeInfo<T>`. This generated information describes each supported payload and selected context
type, so a trimmed application does not need to keep constructors or properties found through
reflection. Jobs caches the information for later calls. Unsupported types fail at compile time.
The Native AOT sample uses the same path. Custom serializers must use these overloads too.

The runtime does not scan assemblies to find jobs. Stored job names, queue names, context keys and
serialized data can outlive a deployment. Keep changes compatible, or drain or migrate old records
before removing their definitions.
