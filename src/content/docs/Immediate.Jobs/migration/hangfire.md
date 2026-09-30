---
title: From Hangfire
description: Move Hangfire fire-and-forget, delayed, recurring and continuation jobs to Immediate.Jobs.
order: 24
group: Migration
---

<script lang="ts">
	import { AgentPrompt, Callout } from '$lib/components/docs';
</script>

Hangfire records a method call, such as `x => x.SendWelcome(userId)`, and replays it on a worker.
Immediate.Jobs uses job classes with typed payloads instead. Most of the migration is turning each
method you enqueue into a job class. Its callers then use that job's generated scheduler.

## Registration

```csharp title="Before: Hangfire"
builder.Services.AddHangfire(config => config
	.UseSqlServerStorage(connectionString));
builder.Services.AddHangfireServer(options =>
{
	options.WorkerCount = 16;
	options.Queues = ["critical", "default"];
});

app.UseHangfireDashboard("/hangfire");
```

```csharp title="After: Immediate.Jobs"
builder.Services.AddMyAppHandlers();
builder.Services.AddMyAppJobs()
	.ConfigureWorkers(options => options.WorkerCount = 16)
	.ConfigureStorage(storage => storage
		.UseEntityFrameworkCore<JobsDbContext>()
		.UseDistributed())
	.AddImmediateJobsDashboard()
	.ConfigureDashboard(options => options.AuthorizationPolicy = "operations")
	.AddHealthCheck();

app.MapImmediateJobsDashboard("/jobs");
```

Queues are declared once with `[QueueDefinition]`, and each job opts in with `[UsesQueue<T>]`, so
there is no queue list to keep in sync. `UseDistributed()` matches Hangfire's model of several
servers sharing one database. See
[Configuring storage providers](/docs/Immediate.Jobs/configuring-storage-providers) for the EF Core
`JobsDbContext` and its migration.

## Fire-and-forget and delayed jobs

```csharp title="Before: Hangfire"
public sealed class EmailService(IEmailSender sender)
{
	[AutomaticRetry(Attempts = 5)]
	[Queue("critical")]
	public Task SendWelcome(Guid userId, string template) =>
		sender.SendAsync(userId, template, CancellationToken.None);
}

BackgroundJob.Enqueue<EmailService>(x => x.SendWelcome(userId, "v2"));
BackgroundJob.Schedule<EmailService>(x => x.SendWelcome(userId, "v2"), TimeSpan.FromMinutes(10));
```

```csharp title="After: Immediate.Jobs"
[QueueDefinition(Name = "critical", Priority = 100)]
public sealed class CriticalQueue;

[Handler, Job(Name = "send-welcome-email", MaxAttempts = 6)]
[UsesQueue<CriticalQueue>]
public sealed partial class SendWelcomeEmail(IEmailSender sender)
{
	public sealed record Payload(Guid UserId, string Template);

	private ValueTask HandleAsync(Payload payload, CancellationToken cancellationToken) =>
		new(sender.SendAsync(payload.UserId, payload.Template, cancellationToken));
}

// Inject SendWelcomeEmail.Scheduler where you called BackgroundJob.
await scheduler.EnqueueAsync(new(userId, "v2"), cancellationToken);
await scheduler.ScheduleAsync(new(userId, "v2"), TimeSpan.FromMinutes(10), cancellationToken);
```

- The method arguments become the `Payload` record. Payloads must be JSON-serializable by the
  source generator, so pass IDs instead of entities or services.
- Hangfire's `Attempts` counts retries, while `MaxAttempts` counts every attempt. `Attempts = 5`
  becomes `MaxAttempts = 6`. Hangfire retries 10 times by default. Immediate.Jobs defaults to 3
  attempts, so set the value explicitly when the old default mattered.
- Replace `IBackgroundJobClient` injections with the job's generated `Scheduler`. It is scoped;
  resolve it from a scope in singleton services.
- `EnqueueAsync` returns a `JobHandle` instead of a string job ID. Use `handle.Value` wherever you
  stored Hangfire's ID.
- Hangfire's `IJobCancellationToken` becomes the `CancellationToken` parameter. It is cancelled on
  timeout and during shutdown.

## Recurring jobs

```csharp title="Before: Hangfire"
RecurringJob.AddOrUpdate<CleanupService>(
	"cleanup-sessions",
	x => x.DeleteExpiredSessions(),
	"*/5 * * * *",
	new RecurringJobOptions { TimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Vienna") });
```

```csharp title="After: Immediate.Jobs"
[Handler, Job(Name = "cleanup-sessions", Cron = "*/5 * * * *", TimeZone = "Europe/Vienna")]
public sealed partial class CleanupSessionsJob(AppDbContext db)
{
	private ValueTask HandleAsync(EmptyJobRequest request, CancellationToken cancellationToken) =>
		new(db.DeleteExpiredSessions(cancellationToken));
}
```

- Five-field cron expressions copy over unchanged. `Cron.Daily()` and similar helpers become their
  expression strings (`"0 0 * * *"`) or the `@daily` style macros.
- Use IANA time-zone IDs, such as `Europe/Vienna`, not Windows IDs.
- Hangfire 1.8's `MisfireHandling` maps to `MisfireHandlingMode`: `Relaxed` becomes `EnqueueOne`
  (the default), `Strict` becomes `EnqueueAll` and `Ignorable` becomes `EnqueueNone`.
- Recurring jobs have no payload. A Hangfire recurring job with arguments, such as one per tenant,
  becomes one recurring job that enqueues a payload job for each tenant, or a dynamic schedule
  through `IRecurringJobScheduler` when schedules are created at runtime.
- `RecurringJob.TriggerJob(id)` becomes the scheduler's `TriggerNowAsync` or
  `JobMonitor.TriggerRecurringAsync(name)`. `RecurringJob.RemoveIfExists` becomes
  `RemoveRecurringAsync` for dynamic schedules. Code-defined schedules are removed when the job
  loses its `Cron`.

<Callout type="warning" title="Cut recurring jobs over in one deployment">

Remove the `RecurringJob.AddOrUpdate` call and delete the schedule from Hangfire storage (for
example with `RecurringJob.RemoveIfExists`) in the same release that adds `Cron`. Otherwise both
systems run the job.

</Callout>

## Preventing overlap

`[DisableConcurrentExecution]` takes a distributed lock around every execution. Choose the
Immediate.Jobs setting that matches why you needed it:

- For recurring jobs, use `OverlapPolicy.Skip` to drop a run while the previous one is unfinished,
  or `OverlapPolicy.Queue` to run them one after another. Both apply across all servers. `Queue`
  needs a provider with graph support.
- For other jobs, `MaxConcurrency = 1` limits executions **per server**, and a queue with
  `Concurrency = 1` does the same for every job in that queue. When work must never overlap across
  servers, keep a lock or a conditional update inside the handler.

## Continuations and batches

```csharp title="Before: Hangfire"
var importId = BackgroundJob.Enqueue<Importer>(x => x.Import(fileId));
BackgroundJob.ContinueJobWith<Indexer>(importId, x => x.Rebuild(fileId));
```

```csharp title="After: Immediate.Jobs"
JobHandle imported = await import.EnqueueAsync(new(fileId), cancellationToken);
await index.ScheduleAfterAsync(new(fileId), imported, cancellationToken: cancellationToken);
```

`ScheduleAfterAsync` also accepts `ContinuationTrigger.Failure` or `Complete`, which cover
Hangfire's `JobContinuationOptions.OnAnyFinishedState`. Hangfire.Pro batches map to
[`IBatchScheduler`](/docs/Immediate.Jobs/batches-and-continuations), which saves a whole graph of
jobs and dependencies in one operation and is included without a separate license. Continuations
and batches need a provider with graph support: EF Core, LinqToDB or in-memory.

## Filters, dashboard and monitoring

- Job filters (`IServerFilter`, `IElectStateFilter`) become Immediate.Handlers
  [behaviors](/docs/Immediate.Jobs/execution-context-and-behaviors) for code that runs around each
  execution. Retry and state rules move into the `[Job]` settings.
- Values you passed through job parameters, such as a tenant or culture, become
  [context extractors](/docs/Immediate.Jobs/execution-context-and-behaviors).
- The Hangfire Dashboard becomes the [Immediate.Jobs dashboard](/docs/Immediate.Jobs/dashboard-and-monitoring).
  It is restricted to development until you set an authorization policy, where Hangfire used
  `IDashboardAuthorizationFilter`.
- `JobStorage.Current.GetMonitoringApi()` becomes `JobMonitor`.

## Drain Hangfire

1. Deploy the ported jobs and stop calling `BackgroundJob` and `RecurringJob`.
2. Keep `AddHangfireServer` running until the Hangfire dashboard shows no enqueued, scheduled or
   retrying jobs.
3. Remove the Hangfire packages, server, dashboard and storage tables.

## Migrate with an agent

<AgentPrompt title="Migrate from Hangfire with an AI agent">

```markdown
Migrate this repository from Hangfire to Immediate.Jobs.

Guide: https://immediateplatform.dev/docs/Immediate.Jobs/migration/hangfire
Documentation: https://immediateplatform.dev/docs/Immediate.Jobs/introduction
If the Immediate.Skills plugins are installed (immediate-jobs, immediate-handlers), use them.

Work in this order and stop for my confirmation after step 2:

1. Inventory. Find every BackgroundJob.Enqueue/Schedule/ContinueJobWith call,
   IBackgroundJobClient and IRecurringJobManager use, RecurringJob.AddOrUpdate definition,
   Hangfire.Pro batch, [AutomaticRetry], [Queue], [DisableConcurrentExecution], job filter,
   dashboard authorization filter and AddHangfireServer option. Note each job's method,
   arguments, cron and time zone.
2. Plan. For each distinct method, propose a [Handler, Job] class with a stable kebab-case Name and
   a Payload record built from the method arguments (IDs, not entities). Map retries
   (Hangfire Attempts N => MaxAttempts N + 1; Hangfire's default is 10 retries), queues
   ([QueueDefinition] + [UsesQueue<T>]), MisfireHandling (Relaxed => EnqueueOne,
   Strict => EnqueueAll, Ignorable => EnqueueNone) and concurrency locks (OverlapPolicy for
   recurring jobs, MaxConcurrency is per server). Recurring jobs are payloadless: turn
   argument-based recurring jobs into a fan-out job. Choose storage (UseDistributed for several
   servers; Redis has no continuations or batches). List anything without an equivalent.
3. Implement. Add the job classes with private HandleAsync(payload, deps..., CancellationToken)
   returning ValueTask, replace Hangfire calls with the generated Scheduler (EnqueueAsync,
   ScheduleAsync, ScheduleAfterAsync) or IBatchScheduler, and register AddXxxHandlers() plus
   AddXxxJobs().ConfigureStorage(...). Replace string job IDs with JobHandle (use .Value when a
   string is stored). Move filters to Immediate.Handlers behaviors. Add the Immediate.Jobs
   dashboard with an authorization policy.
4. Recurring cut-over. In the same change, remove each RecurringJob.AddOrUpdate call and add
   RecurringJob.RemoveIfExists for its ID, so no schedule runs in both systems.
5. Test. Add JobTestHarness tests (Immediate.Jobs.Testing) per job: payload, execution, retries and
   recurring schedule. Build and run the tests.
6. Keep AddHangfireServer and Hangfire storage in place. Do not delete them; list the steps to
   remove Hangfire once its queues are empty.

Finish with a summary: jobs migrated, behavior differences, open questions, and removal steps.
```

</AgentPrompt>
