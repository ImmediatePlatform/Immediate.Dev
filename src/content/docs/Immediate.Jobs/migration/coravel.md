---
title: From Coravel
description: Move Coravel invocables, scheduled tasks and queued work to durable Immediate.Jobs.
order: 26
group: Migration
---

<script lang="ts">
	import { AgentPrompt, Callout } from '$lib/components/docs';
</script>

Coravel runs invocables on a fluent schedule and through an in-memory queue. Nothing is stored, so
queued work is lost on restart and every instance of the application runs every schedule.
Immediate.Jobs stores jobs, retries failures and coordinates several instances through durable
storage. Migrating is mostly a shape change: each `IInvocable` becomes a job class.

## Registration

```csharp title="Before: Coravel"
builder.Services.AddScheduler();
builder.Services.AddQueue();
builder.Services.AddTransient<CleanupSessions>();
builder.Services.AddTransient<SendWelcomeEmail>();

app.Services.UseScheduler(scheduler =>
{
	scheduler.Schedule<CleanupSessions>()
		.EveryFiveMinutes()
		.Zoned(TimeZoneInfo.FindSystemTimeZoneById("Europe/Vienna"))
		.PreventOverlapping(nameof(CleanupSessions));
});
```

```csharp title="After: Immediate.Jobs"
builder.Services.AddMyAppHandlers();
builder.Services.AddMyAppJobs()
	.ConfigureStorage(storage => storage
		.UseEntityFrameworkCore<JobsDbContext>()
		.UseSingleServer());
```

Job classes are registered by the generated `AddMyAppJobs` method, so the `AddTransient` calls and
the `UseScheduler` block go away. `UseSingleServer()` fits an application with one instance; use
`UseDistributed()` when you run several, so each schedule runs once instead of once per instance.
For local development, `UseInMemory()` behaves most like Coravel.

## Scheduled invocables

```csharp title="Before: Coravel"
public sealed class CleanupSessions(AppDbContext db) : IInvocable, ICancellableTask
{
	public CancellationToken Token { get; set; }

	public Task Invoke() => db.DeleteExpiredSessions(Token);
}
```

```csharp title="After: Immediate.Jobs"
[Handler, Job(
	Name = "cleanup-sessions",
	Cron = "*/5 * * * *",
	TimeZone = "Europe/Vienna",
	OverlapPolicy = OverlapPolicy.Skip)]
public sealed partial class CleanupSessions(AppDbContext db)
{
	private ValueTask HandleAsync(EmptyJobRequest request, CancellationToken cancellationToken) =>
		new(db.DeleteExpiredSessions(cancellationToken));
}
```

Coravel's fluent schedule methods become cron expressions:

| Coravel                   | `Cron`            |
| ------------------------- | ----------------- |
| `EverySecond()`           | `* * * * * *`     |
| `EveryThirtySeconds()`    | `*/30 * * * * *`  |
| `EveryMinute()`           | `* * * * *`       |
| `EveryFiveMinutes()`      | `*/5 * * * *`     |
| `Hourly()`                | `0 * * * *`       |
| `HourlyAt(15)`            | `15 * * * *`      |
| `Daily()`                 | `0 0 * * *`       |
| `DailyAt(13, 30)`         | `30 13 * * *`     |
| `Weekly()`                | `0 0 * * MON`     |
| `DailyAt(9, 0).Weekday()` | `0 9 * * MON-FRI` |
| `Cron("0 * * * *")`       | `0 * * * *`       |

- `.Zoned(...)` becomes `TimeZone`, using an IANA ID such as `Europe/Vienna`.
- `.PreventOverlapping(...)` becomes `OverlapPolicy.Skip`. It now applies across all instances,
  not only within one process.
- `.RunOnceAtStart()` has no direct equivalent. Enqueue the job from an `IHostedService` at
  startup if you still need it.
- `.When(...)` conditions move to the start of `HandleAsync`: check the condition and return early.
- Coravel does not retry a failed invocable. Immediate.Jobs retries three times by default. Set
  `MaxAttempts = 1` to keep the old behavior, or make the job safe to retry.

## Queued invocables

```csharp title="Before: Coravel"
public sealed class SendWelcomeEmail(IEmailSender sender)
	: IInvocable, IInvocableWithPayload<WelcomeEmail>
{
	public WelcomeEmail Payload { get; set; } = null!;

	public Task Invoke() => sender.SendAsync(Payload.UserId, Payload.Template, CancellationToken.None);
}

queue.QueueInvocableWithPayload<SendWelcomeEmail, WelcomeEmail>(new(userId, "v2"));
```

```csharp title="After: Immediate.Jobs"
[Handler, Job(Name = "send-welcome-email")]
public sealed partial class SendWelcomeEmail(IEmailSender sender)
{
	public sealed record Payload(Guid UserId, string Template);

	private ValueTask HandleAsync(Payload payload, CancellationToken cancellationToken) =>
		new(sender.SendAsync(payload.UserId, payload.Template, cancellationToken));
}

// Inject SendWelcomeEmail.Scheduler where you injected IQueue.
await scheduler.EnqueueAsync(new(userId, "v2"), cancellationToken);
```

- The payload type becomes a record nested in the job, and the `Payload` property becomes the
  `HandleAsync` parameter.
- `QueueInvocable<T>()` for an invocable without a payload becomes a payloadless job
  (`EmptyJobRequest`) enqueued with `EnqueueAsync(default, cancellationToken)`.
- `QueueAsyncTask(...)` lambdas become job classes, because a lambda cannot be stored.
- Coravel's queue has no delay. Use `ScheduleAsync` with a `TimeSpan` or `DateTimeOffset` where you
  previously waited or used a separate timer.
- `IQueue` was a singleton. The generated scheduler is scoped; resolve it from a scope in
  singleton services.
- Queue broadcasting and events (`IEvent`, `IListener<T>`) are not job features. Keep them, or use
  Immediate.Handlers for in-process messaging.

## Mailing, caching and other Coravel features

Coravel also includes mailing, caching and event broadcasting. They are independent of
scheduling, so you can keep the Coravel packages for those features and remove only
`AddScheduler` and `AddQueue`.

<Callout type="note" title="No drain step needed">

Coravel keeps nothing in storage, so there is nothing to drain. Remove each Coravel schedule in the
same change that adds its `Cron`, and switch queue callers to the generated schedulers. Work that
was still in Coravel's in-memory queue at deployment is lost, exactly as on any other restart.

</Callout>

## Migrate with an agent

<AgentPrompt title="Migrate from Coravel with an AI agent">

```markdown
Migrate this repository's Coravel scheduling and queuing to Immediate.Jobs.

Guide: https://immediateplatform.dev/docs/Immediate.Jobs/migration/coravel
Documentation: https://immediateplatform.dev/docs/Immediate.Jobs/introduction
If the Immediate.Skills plugins are installed (immediate-jobs, immediate-handlers), use them.

Work in this order and stop for my confirmation after step 2:

1. Inventory. Find every IInvocable, IInvocableWithPayload<T> and ICancellableTask, every
   UseScheduler schedule (frequency method, Cron, Zoned, PreventOverlapping, RunOnceAtStart, When,
   Weekday) and every IQueue call (QueueInvocable, QueueInvocableWithPayload, QueueAsyncTask).
   Note which Coravel features are unrelated to scheduling (mailing, caching, events).
2. Plan. Propose one [Handler, Job] class per invocable with a stable kebab-case Name and a
   Payload record (or EmptyJobRequest). Translate each fluent schedule to a Cron value and IANA
   TimeZone, PreventOverlapping to OverlapPolicy.Skip, and When(...) to an early return. Coravel
   never retried: decide MaxAttempts per job. Choose storage (UseSingleServer for one instance,
   UseDistributed for several, UseInMemory only for development). List what has no equivalent
   (RunOnceAtStart, QueueAsyncTask lambdas).
3. Implement. Add the job classes with private HandleAsync(payload, deps..., CancellationToken)
   returning ValueTask, replace IQueue calls with the generated Scheduler (EnqueueAsync,
   ScheduleAsync), register AddXxxHandlers() plus AddXxxJobs().ConfigureStorage(...), and remove
   each migrated schedule from UseScheduler in the same change.
4. Test. Add JobTestHarness tests (Immediate.Jobs.Testing) per job: payload, execution, retries and
   recurring schedule with fake time. Build and run the tests.
5. Keep Coravel packages used for mailing, caching or events. Remove AddScheduler/AddQueue only
   when nothing uses them anymore.

Finish with a summary: jobs migrated, schedule translations, behavior differences (durability,
retries, multi-instance behavior), and open questions.
```

</AgentPrompt>
