---
title: From Quartz.NET
description: Move Quartz.NET jobs, triggers, JobDataMap values and clustered schedulers to Immediate.Jobs.
order: 25
group: Migration
---

<script lang="ts">
	import { AgentPrompt, Callout } from '$lib/components/docs';
</script>

Quartz.NET separates a job (`IJob`) from the triggers that decide when it runs, and passes input
through an untyped `JobDataMap`. In Immediate.Jobs, the job class holds its schedule, retry and
concurrency settings, and its input is a typed payload record. A class that implements `IJob`
usually becomes one job class with its trigger as a `Cron` value.

## Registration

```csharp title="Before: Quartz.NET"
builder.Services.AddQuartz(q =>
{
	q.UsePersistentStore(store =>
	{
		store.UseSqlServer(connectionString);
		store.UseSystemTextJsonSerializer();
		store.UseClustering();
	});

	var key = new JobKey("cleanup-sessions");
	q.AddJob<CleanupSessionsJob>(job => job.WithIdentity(key));
	q.AddTrigger(trigger => trigger
		.ForJob(key)
		.WithIdentity("cleanup-sessions-trigger")
		.WithCronSchedule("0 0/5 * * * ?", cron => cron
			.InTimeZone(TimeZoneInfo.FindSystemTimeZoneById("Europe/Vienna"))
			.WithMisfireHandlingInstructionFireAndProceed()));
});
builder.Services.AddQuartzHostedService(options => options.WaitForJobsToComplete = true);
```

```csharp title="After: Immediate.Jobs"
builder.Services.AddMyAppHandlers();
builder.Services.AddMyAppJobs()
	.ConfigureStorage(storage => storage
		.UseEntityFrameworkCore<JobsDbContext>()
		.UseDistributed());
```

The job, trigger and misfire settings move onto the job class. The hosted service is registered
automatically and drains running jobs for up to `ShutdownTimeout` when the host stops, like
`WaitForJobsToComplete`. A clustered job store becomes `UseDistributed()`; a single RAMJobStore
scheduler becomes in-memory storage, or `UseSingleServer()` when it needs to survive restarts.

## Jobs and triggers

```csharp title="Before: Quartz.NET"
[DisallowConcurrentExecution]
public sealed class CleanupSessionsJob(AppDbContext db) : IJob
{
	public Task Execute(IJobExecutionContext context) =>
		db.DeleteExpiredSessions(context.CancellationToken);
}
```

```csharp title="After: Immediate.Jobs"
[Handler, Job(
	Name = "cleanup-sessions",
	Cron = "0 */5 * * * *",
	TimeZone = "Europe/Vienna",
	OverlapPolicy = OverlapPolicy.Skip,
	MisfireHandlingMode = MisfireHandlingMode.EnqueueOne)]
public sealed partial class CleanupSessionsJob(AppDbContext db)
{
	private ValueTask HandleAsync(EmptyJobRequest request, CancellationToken cancellationToken) =>
		new(db.DeleteExpiredSessions(cancellationToken));
}
```

- The `JobKey` name becomes the job `Name`. It is saved with every run, so keep it stable.
- `context.CancellationToken` becomes the `CancellationToken` parameter.
- Dependencies are injected through the constructor as before, or as `HandleAsync` parameters.
  Each attempt gets a new DI scope.
- A job with several cron triggers becomes several recurring schedules. Create them through
  `IRecurringJobScheduler.AddOrUpdateRecurringAsync` with one name per trigger, or split the job.

### Cron expressions

Immediate.Jobs accepts Quartz-style six-field expressions with seconds first, including `?`, `L`,
`W` and `#`, so most expressions copy over unchanged. Check two differences:

| Quartz.NET         | Immediate.Jobs    | Why                                                   |
| ------------------ | ----------------- | ----------------------------------------------------- |
| `0 0/5 * * * ?`    | `0 0/5 * * * ?`   | Copies unchanged.                                     |
| `0 0 12 L * ?`     | `0 0 12 L * ?`    | Copies unchanged.                                     |
| `0 0 9 ? * 6#3`    | `0 0 9 ? * FRI#3` | Day-of-week numbers start at `0` for Sunday, not `1`. |
| `0 0 18 ? * 6L`    | `0 0 18 ? * FRIL` | Same numbering change; use day names to avoid it.     |
| `0 0 0 1 1 ? 2030` | Not supported     | A schedule that ends fails once it has no next run.   |

Quartz numbers days from `1` (Sunday) to `7` (Saturday), while Immediate.Jobs numbers them from
`0` (Sunday) to `6` (Saturday). Numeric days therefore shift by one day. Replace them with names
such as `MON-FRI` or `FRI#3`. Remove the optional year field; recurring schedules must repeat
forever.

Simple triggers (`WithIntervalInSeconds(30).RepeatForever()`) become cron expressions such as
`*/30 * * * * *`. Calendar-interval triggers can use an RFC 5545 recurrence rule, such as
`FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=1;BYHOUR=6;BYMINUTE=0;BYSECOND=0`. Always set `BYHOUR`,
`BYMINUTE` and `BYSECOND` in a rule; a missing part takes its value from the time the schedule was
saved. `INTERVAL` also counts from that time. Check every translated schedule with a [`JobTestHarness`](/docs/Immediate.Jobs/testing-jobs)
test that advances the clock.

### Misfires

| Quartz.NET instruction                   | `MisfireHandlingMode` |
| ---------------------------------------- | --------------------- |
| `FireAndProceed` (cron default behavior) | `EnqueueOne`          |
| `IgnoreMisfires`                         | `EnqueueAll`          |
| `DoNothing`                              | `EnqueueNone`         |

Immediate.Jobs has no misfire threshold. Any run that was not created while the scheduler was
unavailable counts as missed.

## JobDataMap and one-off jobs

```csharp title="Before: Quartz.NET"
var job = JobBuilder.Create<ImportJob>()
	.WithIdentity($"import-{fileId}")
	.UsingJobData("fileId", fileId.ToString())
	.Build();
var trigger = TriggerBuilder.Create().StartAt(DateTimeOffset.UtcNow.AddMinutes(5)).Build();
await scheduler.ScheduleJob(job, trigger, cancellationToken);

// In ImportJob.Execute:
var fileId = Guid.Parse(context.MergedJobDataMap.GetString("fileId")!);
```

```csharp title="After: Immediate.Jobs"
[Handler, Job(Name = "import-file")]
public sealed partial class ImportJob(Importer importer)
{
	public sealed record Payload(Guid FileId);

	private ValueTask HandleAsync(Payload payload, CancellationToken cancellationToken) =>
		importer.ImportAsync(payload.FileId, cancellationToken);
}

await importScheduler.ScheduleAsync(new(fileId), TimeSpan.FromMinutes(5), cancellationToken);
```

The `JobDataMap` keys become payload properties, so a misspelled key becomes a compile error.
Each scheduling call creates a new job; you no longer need a unique `JobKey` per run. The returned
`JobHandle` identifies the job for cancellation and monitoring.

`[PersistJobDataAfterExecution]` has no equivalent, because payloads are immutable. Store state
that must carry over between runs in your own database, or schedule the next job with the updated
payload.

## Retries and concurrency

- Quartz does not retry a failed job unless the job throws `JobExecutionException` with
  `RefireImmediately` or schedules itself again. Immediate.Jobs retries by default: set
  `MaxAttempts`, `Backoff` and `BackoffBase`. Use `MaxAttempts = 1` to keep the old behavior.
- `[DisallowConcurrentExecution]` on a recurring job becomes `OverlapPolicy.Skip` (drop the new
  run) or `OverlapPolicy.Queue` (run it after the previous one). Both apply across all servers;
  `Queue` needs graph support. For other jobs, `MaxConcurrency` limits executions per server.
- Trigger `Priority` becomes a `[QueueDefinition]` with a higher `Priority`, assigned with
  `[UsesQueue<T>]`.
- Quartz's thread pool size (`quartz.threadPool.maxConcurrency`) becomes `WorkerCount`.

## Listeners, calendars and management

- `IJobListener` and `ITriggerListener` become Immediate.Handlers
  [behaviors](/docs/Immediate.Jobs/execution-context-and-behaviors) around each execution, plus
  the built-in [OpenTelemetry traces and metrics](/docs/Immediate.Jobs/observability-and-health).
- Calendars (`HolidayCalendar`, `DailyCalendar`) have no equivalent. Check the exclusion at the
  start of `HandleAsync` and return early.
- `IScheduler.PauseJob`, `ResumeJob` and `TriggerJob` become `JobMonitor.PauseRecurringAsync`,
  `ResumeRecurringAsync` and `TriggerRecurringAsync`. `DeleteJob` becomes `CancelAsync` on the
  scheduler for a single run, or `RemoveRecurringAsync` for a dynamic schedule.

<Callout type="warning" title="Cut schedules over in one deployment">

Remove each Quartz trigger in the same release that adds its `Cron`, and delete the trigger from a
persistent job store, so a schedule never runs in both systems.

</Callout>

## Drain Quartz.NET

1. Deploy the ported jobs and stop scheduling new Quartz jobs.
2. Keep the Quartz hosted service running until no triggers with a future fire time remain.
3. Remove the Quartz packages, hosted service and `QRTZ_` tables.

## Migrate with an agent

<AgentPrompt title="Migrate from Quartz.NET with an AI agent">

```markdown
Migrate this repository from Quartz.NET to Immediate.Jobs.

Guide: https://immediateplatform.dev/docs/Immediate.Jobs/migration/quartz
Documentation: https://immediateplatform.dev/docs/Immediate.Jobs/introduction
If the Immediate.Skills plugins are installed (immediate-jobs, immediate-handlers), use them.

Work in this order and stop for my confirmation after step 2:

1. Inventory. Find every IJob implementation, AddJob/AddTrigger/ScheduleJob call, trigger type
   (cron, simple, calendar interval), time zone, misfire instruction, JobDataMap key,
   [DisallowConcurrentExecution], [PersistJobDataAfterExecution], listener, calendar, thread pool
   setting and job store/clustering configuration.
2. Plan. For each IJob, propose a [Handler, Job] class whose Name is the JobKey name, with a
   Payload record built from the JobDataMap keys (or EmptyJobRequest for recurring jobs).
   Translate cron: Quartz syntax (?, L, W, #) is accepted, but numeric day-of-week values
   shift (Quartz 1=Sunday..7=Saturday; Immediate.Jobs 0=Sunday..6=Saturday), so replace
   numeric days with names (MON-FRI, FRI#3, FRIL). Remove the year field. RFC 5545 rules must set
   BYHOUR, BYMINUTE and BYSECOND explicitly. Map misfires (FireAndProceed => EnqueueOne,
   IgnoreMisfires => EnqueueAll, DoNothing => EnqueueNone), DisallowConcurrentExecution
   (OverlapPolicy.Skip or Queue for recurring jobs; MaxConcurrency is per server), retries
   (Quartz does not retry by default; set MaxAttempts explicitly) and storage (clustered store =>
   UseDistributed). List features without an equivalent (calendars, persisted JobDataMap).
3. Implement. Add the job classes with private HandleAsync(payload, deps..., CancellationToken)
   returning ValueTask, replace IScheduler calls with the generated Scheduler and JobMonitor, move
   listeners to Immediate.Handlers behaviors, and register AddXxxHandlers() plus
   AddXxxJobs().ConfigureStorage(...).
4. Schedule cut-over. In the same change, remove each migrated Quartz trigger and job registration
   so no schedule runs in both systems.
5. Test. Add JobTestHarness tests (Immediate.Jobs.Testing) per job, including fake-time tests that
   prove each translated cron expression fires at the expected times. Build and run the tests.
6. Keep the Quartz hosted service and job store in place. Do not delete them; list the steps to
   remove Quartz once no triggers remain.

Finish with a summary: jobs migrated, cron translations, behavior differences, open questions,
and removal steps.
```

</AgentPrompt>
