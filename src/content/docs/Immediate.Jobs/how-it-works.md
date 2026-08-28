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

At assembly level, `IJ.ServiceCollectionExtensions.g.cs` contains `AddXxxJobs` and the generated
`RecurringJobs` service. `AddXxxJobs` registers jobs and returns `IImmediateJobsBuilder`.
`RecurringJobs` can trigger payloadless jobs by name. Both types are placed in the project's
`RootNamespace`. Calling the registration method again does not duplicate jobs, queues or the
hosted worker. The assembly identifier and tags follow the same conventions as the other platform
generators.

## Enqueue data flow

1. Application code resolves the scoped generated scheduler.
2. The scheduler captures the current trace link and any selected context values.
3. It serializes the payload and context, creates an ID, and builds a record with the job name,
   queue, due time and optional group or batch data.
4. Storage saves that record. An open batch holds it in memory until commit.
5. The scheduler returns a `JobHandle`; it does not wait for execution.

## Worker data flow

The hosted service prepares storage and recurring schedules. It asks storage for due jobs based on
queue priority and the available capacity for the worker, queue and job. Storage marks each
selected job `Active`, assigns its worker and lease, increments its attempt number and saves an
execution record. It makes those changes in one operation.

Distributed mode coordinates workers through shared storage. Single-server mode selects jobs in
memory and copies each claim to durable storage.

For each selected job, the worker starts tracing, logging, lease renewal and its timeout. It also
creates a new dependency injection scope. The generated invoker restores the payload and context,
sets `JobDetails`, resolves the handler and runs its Immediate.Handlers behaviors.

On success, Jobs closes the attempt and saves any follow-up jobs that the handler buffered. On
failure, it saves the full exception and either schedules a retry or leaves the job failed. Every
update includes the attempt number and worker ID. An old worker therefore cannot overwrite a job
that another worker acquired or a user cancelled.

When a batch job finishes, storage starts eligible child jobs and marks other branches `Skipped`.
It saves these changes together with the parent's result.

## Recurring runs

At startup, Jobs updates the code-defined schedules in storage. It then checks for schedules that
are due. Storage creates one job for each due time and advances the schedule in the same operation,
which prevents two workers from creating the same run. If the overlap policy is `Skip`, Jobs still
saves a skipped run so monitoring shows what happened.

## Generated JSON, trimming and Native AOT

Schedulers and invokers call `IJobSerializer` overloads that receive generated
`JsonTypeInfo<T>`. This generated information describes each supported payload and selected context
type, so a trimmed application does not need to keep constructors or properties found through
reflection. Jobs caches the information for later calls. Unsupported types fail at compile time.
The Native AOT sample uses the same path. Custom serializers must use these overloads too.

The runtime does not scan assemblies to find jobs. Stored job names, queue names, context keys and
serialized data can outlive a deployment. Keep changes compatible, or drain or migrate old records
before removing their definitions.
