---
title: Recurring jobs
description: Define and manage recurring schedules with cron expressions, time zones and overlap policies.
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

For infrastructure that selects a payloadless job by its persisted job name, inject the generated
root-namespace `RecurringJobs` singleton instead of a specific scheduler:

```csharp
public sealed class NamedJobOperations(RecurringJobs recurringJobs)
{
	public ValueTask RunNowAsync(CancellationToken cancellationToken) =>
		recurringJobs.TriggerNowAsync("cleanup-sessions", cancellationToken);
}
```

This name is the job's `[Job(Name = ...)]` identity, not a dynamic schedule name. Name matching is
ordinal and case-sensitive. An unknown name throws `ImmediateJobException` before a scope is
created. For a known name, the dispatcher creates a scope and resolves the generated scheduler; a
job excluded by the current registration tags also throws `ImmediateJobException`. Payload-bearing
jobs are not included in this dispatcher. The method completes when the immediate invocation is
persisted and does not return its `JobHandle`; use the typed scheduler when the caller needs the
handle.

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

At startup, a provider with recurring support upserts every code-defined schedule and removes
obsolete code-defined rows. Dynamic rows are left alone. A queue-only custom provider skips this
step. This reconciliation means a deploy can change a cron expression, but two versions of an
application should not intentionally define different schedules under the same name.

When the persisted cron expression and time zone are unchanged, reconciliation preserves its
stored `NextRunAt`, including an occurrence that became due while the application was stopped. A
changed cron expression or time zone recomputes the next occurrence from the current time.

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

`AddOrUpdateRecurringAsync` is durable and idempotently replaces the named dynamic schedule.
`TriggerNowAsync` creates an immediate invocation without moving the next cron occurrence. The
dashboard can trigger, pause and resume existing schedules.

## Manage persisted schedules

Use the concrete `JobMonitor` when administrative code needs to act on an existing schedule by its
persisted schedule name:

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

`JobMonitor.TriggerRecurringAsync` takes a schedule name. By contrast,
`RecurringJobs.TriggerNowAsync` takes a generated job name. The difference matters when a dynamic
schedule name, such as `tenant-42-cleanup`, differs from its job name, such as `tenant-cleanup`.
Triggering creates an immediate invocation without moving the next cron occurrence.

## Overlap policy

| Policy       | When the previous occurrence is still active                                     |
| ------------ | -------------------------------------------------------------------------------- |
| `Skip`       | Persist the occurrence as terminal `Skipped` history without executing it.       |
| `Queue`      | Materialize every occurrence but admit only one invocation of the job at a time. |
| `Concurrent` | Allow both invocations to execute, subject to other concurrency limits.          |

Materialization is coordinated in durable storage, so `Recurring` capability is required. Redis
and the SQL providers support it; graph support is unrelated. A malformed persisted schedule is
logged and skipped for that pass without blocking other recurring schedules or ordinary queued
jobs.

## NodaTime

Install `Immediate.Jobs.NodaTime` to configure NodaTime payload serialization and use `Duration`,
`Instant` and `DateTimeZone` scheduling overloads. See the dedicated
[NodaTime guide](/docs/Immediate.Jobs/nodatime) for registration, examples and the complete package
surface.
