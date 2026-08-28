---
title: Recurring jobs
description: Create recurring schedules, run them on demand and control overlapping runs.
order: 4
group: Guides
---

Recurring jobs are payloadless. A code-defined schedule lives on `[Job]`:

```csharp
[Handler, Job(Name = "cleanup-sessions", Cron = "0 */5 * * * *", TimeZone = "Europe/Vienna")]
public sealed partial class CleanupSessionsJob(AppDbContext db)
{
	private ValueTask HandleAsync(EmptyJobRequest request, CancellationToken cancellationToken) =>
		new(db.DeleteExpiredSessions(cancellationToken));
}
```

Use the generated `RecurringJobs` service when code needs to run a payloadless job by name instead
of using its scheduler type:

```csharp
public sealed class NamedJobOperations(RecurringJobs recurringJobs)
{
	public ValueTask RunNowAsync(CancellationToken cancellationToken) =>
		recurringJobs.TriggerNowAsync("cleanup-sessions", cancellationToken);
}
```

`TriggerNowAsync` matches `[Job(Name = ...)]` exactly and is case-sensitive. It throws
`ImmediateJobException` for an unknown name or a job excluded by registration tags. Only
payloadless jobs are available. The method returns after saving the new run but does not return its
`JobHandle`; use the typed scheduler when the caller needs that handle.

Cron expressions accept five fields (minute precision), six fields (seconds first), or the
case-insensitive macros `@yearly`/`@annually`, `@monthly`, `@weekly`, `@daily`/`@midnight`,
`@hourly`, `@every_minute` and `@every_second`. Time zones are IANA identifiers and default to
`UTC`. Cron and time-zone values are validated during startup; invalid code-defined cron is also
an analyzer error.

Inject `CleanupSessionsJob.Scheduler` to trigger a code-defined schedule immediately:

```csharp
public sealed class CleanupOperations(CleanupSessionsJob.Scheduler scheduler)
{
	public async ValueTask RunNowAsync(CancellationToken cancellationToken)
	{
		_ = await scheduler.TriggerNowAsync(cancellationToken);
	}
}
```

At startup, Jobs saves or updates every code-defined schedule when storage supports recurring
jobs. It removes old code-defined schedules but leaves dynamic schedules alone. A queue-only
provider skips this work. This lets a deployment change a cron expression. Do not run two versions
of an application that define different schedules under the same name.

If the saved cron expression and time zone are unchanged, Jobs keeps `NextRunAt`, including a run
that became due while the application was stopped. If either setting changes, Jobs calculates the
next run from the current time.

## Dynamic schedules

Omit `Cron` from a payloadless job and inject its generated scheduler as
`IRecurringJobScheduler`:

```csharp
[Handler, Job(Name = "tenant-cleanup")]
public sealed partial class TenantCleanupJob(AppDbContext db)
{
	private ValueTask HandleAsync(EmptyJobRequest request, CancellationToken cancellationToken) =>
		new(db.DeleteExpiredSessions(cancellationToken));
}

public sealed class TenantScheduleManager(TenantCleanupJob.Scheduler tenantCleanupScheduler)
{
	public async ValueTask ConfigureAsync(CancellationToken cancellationToken)
	{
		await tenantCleanupScheduler.AddOrUpdateRecurringAsync(
			"tenant-42-cleanup",
			"0 0 3 * * *",
			"UTC",
			cancellationToken
		);
	}

	public ValueTask RemoveAsync(CancellationToken cancellationToken) =>
		tenantCleanupScheduler.RemoveRecurringAsync("tenant-42-cleanup", cancellationToken);
}
```

`AddOrUpdateRecurringAsync` saves the schedule and replaces an existing schedule with the same
name. The scheduler also saves its generated queue name, so every occurrence uses the queue selected
by `[UsesQueue<TQueue>]`. `TriggerNowAsync` starts a run now without moving the next cron occurrence.
The dashboard can also trigger, pause and resume schedules.

## Manage stored schedules

Use `JobMonitor` to pause, resume or trigger a stored schedule by its schedule name:

```csharp
public sealed class RecurringScheduleOperations(JobMonitor jobs)
{
	public ValueTask PauseAsync(string name, CancellationToken cancellationToken) =>
		jobs.PauseRecurringAsync(name, cancellationToken);

	public ValueTask ResumeAsync(string name, CancellationToken cancellationToken) =>
		jobs.ResumeRecurringAsync(name, cancellationToken);

	public ValueTask RunNowAsync(string name, CancellationToken cancellationToken) =>
		jobs.TriggerRecurringAsync(name, cancellationToken);
}
```

`JobMonitor.TriggerRecurringAsync` takes a schedule name. `RecurringJobs.TriggerNowAsync` takes the
job name from `[Job(Name = ...)]`. These names can differ: a dynamic schedule named
`tenant-42-cleanup` can run the job named `tenant-cleanup`. Both methods start a run without moving
the next cron occurrence.

## Overlap policy

| Policy       | When the previous run is still active                                  |
| ------------ | ---------------------------------------------------------------------- |
| `Skip`       | Record the new run as `Skipped` without executing it.                  |
| `Queue`      | Create every run, but execute only one instance of this job at a time. |
| `Concurrent` | Allow runs to overlap, subject to other concurrency limits.            |

Recurring schedules need storage with recurring support so multiple workers do not create the same
run. Redis and the SQL providers support them; graph support is unrelated. Jobs logs and skips a
malformed stored schedule without blocking other schedules or queued jobs.

## NodaTime

Install `Immediate.Jobs.NodaTime` to configure NodaTime payload serialization and use `Duration`,
`Instant` and `DateTimeZone` scheduling overloads. See the dedicated
[NodaTime guide](/docs/Immediate.Jobs/nodatime) for registration, examples and the full API
reference.
