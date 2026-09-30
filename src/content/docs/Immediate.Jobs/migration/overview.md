---
title: Migration overview
description: Plan a move to Immediate.Jobs from Hangfire, Quartz.NET, Coravel or hand-written background services.
order: 23
group: Migration
---

<script lang="ts">
	import { AgentPrompt, Callout, CardGrid, LinkCard } from '$lib/components/docs';
</script>

Most .NET job libraries share the same building blocks: fire-and-forget work, delayed work,
recurring schedules, retries, queues and a dashboard. Immediate.Jobs covers the same ground, but it
declares each job as an [Immediate.Handlers](/docs/Immediate.Handlers/introduction) handler and
generates a typed scheduler for it at compile time. Jobs are not recorded as method calls, and the
runtime never finds them by reflection.

<CardGrid cols={2}>
	<LinkCard title="From Hangfire" description="Expression-based enqueueing, recurring jobs, continuations and batches." href="/docs/Immediate.Jobs/migration/hangfire" />
	<LinkCard title="From Quartz.NET" description="IJob classes, triggers, JobDataMap, misfires and clustering." href="/docs/Immediate.Jobs/migration/quartz" />
	<LinkCard title="From Coravel" description="Invocables, fluent schedules and the in-memory queue." href="/docs/Immediate.Jobs/migration/coravel" />
	<LinkCard title="From BackgroundService" description="Timer loops, Channel queues and hand-rolled retries." href="/docs/Immediate.Jobs/migration/background-service" />
</CardGrid>

## Concept map

| Concept          | Hangfire                               | Quartz.NET                           | Coravel                        | Immediate.Jobs                                                              |
| ---------------- | -------------------------------------- | ------------------------------------ | ------------------------------ | --------------------------------------------------------------------------- |
| Unit of work     | Any public method                      | `IJob` class                         | `IInvocable` class             | `[Handler, Job]` partial class                                              |
| Job input        | Serialized method arguments            | `JobDataMap`                         | `IInvocableWithPayload<T>`     | Typed payload record                                                        |
| Run now          | `BackgroundJob.Enqueue`                | `TriggerJob` or a one-shot trigger   | `IQueue.QueueInvocable`        | `Scheduler.EnqueueAsync`                                                    |
| Run later        | `BackgroundJob.Schedule`               | Simple trigger with a start time     | Not supported                  | `Scheduler.ScheduleAsync`                                                   |
| Recurring        | `RecurringJob.AddOrUpdate`             | Cron trigger                         | `UseScheduler` fluent schedule | `[Job(Cron = ...)]` or `IRecurringJobScheduler`                             |
| Retries          | `[AutomaticRetry]`                     | `JobExecutionException` in `Execute` | Manual                         | `MaxAttempts`, `Backoff`, `BackoffBase`                                     |
| Avoid overlap    | `[DisableConcurrentExecution]`         | `[DisallowConcurrentExecution]`      | `PreventOverlapping`           | `OverlapPolicy`, `MaxConcurrency`                                           |
| Missed schedules | `MisfireHandling` (1.8+)               | Misfire instructions                 | Not tracked                    | `MisfireHandlingMode`                                                       |
| Priorities       | Named queues in order                  | Trigger priority                     | Not supported                  | `[QueueDefinition(Priority, Concurrency)]`                                  |
| Workflows        | Continuations; batches in Hangfire.Pro | Listeners or chained jobs            | Not supported                  | [Batches and continuations](/docs/Immediate.Jobs/batches-and-continuations) |
| Persistence      | SQL Server, Redis and others           | ADO.NET job store                    | None (in memory)               | In-memory, EF Core, LinqToDB or Redis                                       |
| Dashboard        | Hangfire Dashboard                     | Third-party                          | None                           | [Immediate.Jobs.Dashboard](/docs/Immediate.Jobs/dashboard-and-monitoring)   |

## What changes for your code

- **Jobs are declared, not captured.** A Hangfire expression such as `x => x.Send(id)` becomes a
  job class with a payload record. The job name, payload shape, queue name and context keys are
  saved with every job, so treat them like a database schema.
- **Handlers get dependency injection and behaviors.** Each attempt runs in a fresh DI scope
  through the Immediate.Handlers pipeline, so logging, validation or tenant behaviors work the same
  as in request handlers.
- **Recurring jobs are payloadless.** A recurring job receives `EmptyJobRequest`. When a schedule
  used arguments, have the recurring job load its input, or fan out one payload job per item.
- **Delivery is at least once.** Like Hangfire and clustered Quartz, a job can run again after a
  crash. Keep handlers [idempotent](/docs/Immediate.Jobs/delivery-guarantees).
- **Storage is explicit.** Pick a provider and a mode in
  [`ConfigureStorage`](/docs/Immediate.Jobs/choosing-storage). Batches and fair queues need a
  provider with graph support, which Redis does not have.

## A safe migration plan

1. **Inventory every job.** List each enqueue call, schedule, recurring definition, queue, retry
   attribute, concurrency lock and dashboard dependency. Include jobs that only exist in storage,
   such as schedules added at runtime.
2. **Add Immediate.Jobs next to the old library.** Install `Immediate.Jobs`, register handlers and
   jobs, and pick storage. Keep the old server running so work that is already queued can finish.
3. **Port one job at a time.** Create the job class, choose a stable `Name`, move the method body
   into `HandleAsync`, and switch its callers to the generated scheduler. Add a
   [`JobTestHarness`](/docs/Immediate.Jobs/testing-jobs) test for each job.
4. **Move recurring schedules in one deployment.** Add `Cron` to the new job and remove the old
   recurring definition in the same release, so a schedule never runs in both systems.
5. **Drain, then remove.** Stop enqueueing into the old library, wait until its queues and
   scheduled jobs are empty, then remove its packages, storage and dashboard.

<Callout type="warning" title="Delayed jobs do not move automatically">

Immediate.Jobs cannot read another library's storage. Jobs that are already scheduled in the old
system stay there. Either keep its server running until the last one is due, or export them and
schedule them again with `ScheduleAsync`.

</Callout>

## Other libraries

The same concept map applies to other schedulers:

- **TickerQ** time and cron tickers map to delayed jobs and recurring jobs. Function names become
  job names, and request payloads become payload records.
- **Azure Functions timer triggers** and **Kubernetes CronJobs** map to code-defined recurring
  jobs that run inside your application.
- **MassTransit or NServiceBus message scheduling** is part of a message bus. Keep the bus for
  messaging between services, and move work that only schedules code within one application to
  Immediate.Jobs.

## Migrate with an agent

The agent prompt on each guide is written for that library. Use this one when you use several
libraries, or one without its own guide.

<AgentPrompt>

```markdown
Migrate this repository's background jobs to Immediate.Jobs.

Documentation: https://immediateplatform.dev/docs/Immediate.Jobs/introduction
Migration guides: https://immediateplatform.dev/docs/Immediate.Jobs/migration/overview
If the Immediate.Skills plugins are installed (immediate-jobs, immediate-handlers), use them.

Work in this order and stop for my confirmation after step 2:

1. Inventory. Find every background job library in use (Hangfire, Quartz.NET, Coravel, TickerQ,
   hand-written BackgroundService loops, timers, Channel queues). For each job, record: where it is
   defined, how it is enqueued or scheduled, its arguments, recurring schedule and time zone, retry
   and timeout settings, concurrency limits, queue or priority, and any dashboard or monitoring use.
2. Plan. Propose one Immediate.Jobs job per unit of work with a stable kebab-case Name, a payload
   record (or EmptyJobRequest for recurring work), MaxAttempts/Backoff/Timeout, OverlapPolicy,
   MisfireHandlingMode, MaxConcurrency and queue. Choose a storage provider and mode
   (UseSingleServer for one process, UseDistributed for several; Redis has no batches or fair
   queues). List anything with no direct equivalent and how you will handle it.
3. Implement. Add Immediate.Jobs and Immediate.Handlers, create each job as a [Handler, Job]
   partial class with a private HandleAsync(payload, dependencies..., CancellationToken) returning
   ValueTask, and switch callers to the generated Scheduler. Register AddXxxHandlers() and
   AddXxxJobs() with ConfigureStorage. Keep handlers idempotent: delivery is at least once.
4. Recurring cut-over. Move each recurring schedule in the same change that removes the old
   definition, so it never runs twice.
5. Test. Add JobTestHarness tests (Immediate.Jobs.Testing) for scheduling, execution, retries and
   recurring behavior. Build and run the tests.
6. Do not remove the old library, its storage or its server. List what must drain first and the
   steps to remove it afterwards.

Finish with a summary: jobs migrated, behavior differences, open questions, and removal steps.
```

</AgentPrompt>
