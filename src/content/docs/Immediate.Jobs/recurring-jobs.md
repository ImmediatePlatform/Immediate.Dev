---
title: Recurring jobs
description: Define and manage recurring schedules with cron expressions, time zones and overlap policies.
order: 4
group: Guides
---

Recurring jobs are payloadless. A code-defined schedule lives on `[Job]`:

```csharp
[Handler, Job(Cron = "0 */5 * * * *", TimeZone = "Europe/Vienna")]
public sealed partial class CleanupSessionsJob(AppDbContext db)
{
	private ValueTask HandleAsync(EmptyJobRequest request, CancellationToken cancellationToken) =>
		new(db.DeleteExpiredSessions(cancellationToken));
}
```

Cron expressions accept five fields (minute precision) or six fields (seconds first). Time zones
are IANA identifiers and default to `UTC`. Cron and time-zone values are validated during startup;
invalid cron is also an analyzer error.

Inject `CleanupSessionsJob.Scheduler` to trigger a code-defined schedule immediately:

```csharp
await scheduler.TriggerNowAsync(cancellationToken);
```

At startup the hosted service upserts every code-defined schedule and removes obsolete
code-defined rows. Dynamic rows are left alone. This reconciliation means a deploy can change a
cron expression, but two versions of an application should not intentionally define different
schedules under the same name.

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

await tenantCleanupScheduler.AddOrUpdateRecurringAsync(
	"tenant-42-cleanup",
	"0 0 3 * * *",
	"UTC",
	cancellationToken
);
await tenantCleanupScheduler.RemoveRecurringAsync("tenant-42-cleanup", cancellationToken);
```

`AddOrUpdateRecurringAsync` is durable and idempotently replaces the named dynamic schedule.
`TriggerNowAsync` creates an immediate invocation without moving the next cron occurrence. The
dashboard can trigger, pause and resume existing schedules.

## Overlap policy

| Policy       | When the previous occurrence is still active                            |
| ------------ | ----------------------------------------------------------------------- |
| `Skip`       | Do not materialize this occurrence.                                     |
| `Queue`      | Materialize it and let it wait.                                         |
| `Concurrent` | Allow both invocations to execute, subject to other concurrency limits. |

Materialization is coordinated in durable storage, so `Recurring` capability is required. Redis
and the SQL providers support it; graph support is unrelated.

## NodaTime

Install `Immediate.Jobs.NodaTime` to configure NodaTime payload serialization and use `Duration`,
`Instant` and `DateTimeZone` scheduling overloads. See the dedicated
[NodaTime guide](/docs/Immediate.Jobs/nodatime) for registration, examples and the complete package
surface.
