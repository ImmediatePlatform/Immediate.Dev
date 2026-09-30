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

The `Cron` value accepts either a cron expression or an RFC 5545 recurrence rule:

- five-field cron (minute precision), such as `*/15 * * * *`;
- six-field cron with seconds first, such as `0 */5 * * * *`;
- the case-insensitive macros `@yearly`/`@annually`, `@monthly`, `@weekly`, `@daily`/`@midnight` and
  `@hourly`;
- an RFC 5545 `RRULE` body, such as `FREQ=WEEKLY;BYDAY=MO;BYHOUR=6;BYMINUTE=0;BYSECOND=0`.

A recurrence rule must repeat forever, so rules with `COUNT` or `UNTIL` are rejected. Set
`BYHOUR`, `BYMINUTE` and `BYSECOND` explicitly: a part you leave out, and the start of an
`INTERVAL`, is taken from the time the schedule is saved. Time zones are
IANA identifiers and default to `UTC`. Code-defined schedules are an analyzer error when they cannot
be parsed, and every schedule is checked again when it is saved. A schedule with no future
occurrence throws `ImmediateJobException`.

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

To trigger a stored schedule by name instead, use
[`JobMonitor.TriggerRecurringAsync`](#manage-stored-schedules).

At startup, Jobs merges the code-defined schedules into storage in one operation when storage
supports recurring jobs. A queue-only provider skips this work. The merge:

- adds new code-defined schedules;
- keeps `NextRunAt`, `LastRunAt` and the paused state of a schedule whose cron expression and time
  zone are unchanged, including a run that became due while the application was stopped;
- recalculates `NextRunAt` from the current time when the cron expression or time zone changed,
  but keeps its `LastRunAt` and paused state;
- turns a dynamic schedule with the same name into a code-defined schedule instead of creating a
  duplicate;
- removes code-defined schedules that no longer exist in code and leaves other dynamic schedules
  alone.

This lets a deployment change a cron expression. Do not run two versions of an application that
define different schedules under the same name.

## Missed runs

When no scheduler is running, or storage is unavailable, a schedule can miss one or more
occurrences. `MisfireHandlingMode` on `[Job]` controls what happens when the worker catches up:

```csharp
[Handler, Job(Cron = "0 * * * *", MisfireHandlingMode = MisfireHandlingMode.EnqueueAll)]
public sealed partial class HourlyRollupJob(ReportingService reports)
{
	private ValueTask HandleAsync(EmptyJobRequest request, CancellationToken cancellationToken) =>
		reports.RollUpPreviousHourAsync(cancellationToken);
}
```

| Mode                   | Missed occurrences                                                  |
| ---------------------- | ------------------------------------------------------------------- |
| `EnqueueOne` (default) | Create one run due now for all missed occurrences.                  |
| `EnqueueAll`           | Create one run for every missed occurrence, in order.               |
| `EnqueueNone`          | Create no runs and move the schedule to its next future occurrence. |

In every mode, the schedule then continues from its next future occurrence. Jobs logs a
`RecurringOccurrencesMissed` warning with the number of missed occurrences and the selected mode.
The same mode applies to dynamic schedules that run the job.

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
name. It accepts the same cron and recurrence-rule formats as `[Job(Cron = ...)]`. The scheduler also saves its generated queue name, so every occurrence uses the queue selected
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

`JobMonitor.TriggerRecurringAsync` takes a schedule name, which can differ from the job name in
`[Job(Name = ...)]`: a dynamic schedule named `tenant-42-cleanup` can run the job named
`tenant-cleanup`. For a code-defined schedule, the schedule name is the job name. Like the
scheduler's `TriggerNowAsync`, it starts a run without moving the next cron occurrence.

## Overlap policy

`OverlapPolicy` decides what happens when a new occurrence is due while an earlier run of the same
job has not finished. Jobs checks every run of that job that is not yet in a final state, including
runs started with `TriggerNowAsync`.

| Policy           | When an earlier run has not finished                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `Skip` (default) | Record the new run as `Skipped` without executing it.                                     |
| `Queue`          | Create the new run as a continuation of the latest unfinished run, so runs never overlap. |
| `Concurrent`     | Allow runs to overlap, subject to other concurrency limits.                               |

Recurring schedules need storage with recurring support so multiple workers do not create the same
run. Redis and the SQL providers support them. `Queue` also needs graph support, because each
queued run waits on a continuation link. Redis does not support graphs, so a `Queue` schedule on
Redis fails to create its runs and logs `RecurringMaterializationFailed`. Jobs logs and skips a
malformed stored schedule without blocking other schedules or queued jobs.

## NodaTime

Install `Immediate.Jobs.NodaTime` to configure NodaTime payload serialization and use `Duration`,
`Instant` and `DateTimeZone` scheduling overloads. See the dedicated
[NodaTime guide](/docs/Immediate.Jobs/nodatime) for registration, examples and the full API
reference.
