---
title: From BackgroundService
description: Replace hand-written timer loops, Channel queues and retry code with Immediate.Jobs.
order: 27
group: Migration
---

<script lang="ts">
	import { AgentPrompt, Callout } from '$lib/components/docs';
</script>

Many applications start with a `BackgroundService` that loops on a timer, or reads work from a
`Channel<T>`. These work until the application runs on more than one instance, restarts with work
in memory, or needs retries and monitoring. Immediate.Jobs replaces the loop, the queue and the
retry code, and keeps the work itself in an ordinary handler.

## Timer loops

```csharp title="Before: BackgroundService"
public sealed class CleanupWorker(IServiceScopeFactory scopes, ILogger<CleanupWorker> logger)
	: BackgroundService
{
	protected override async Task ExecuteAsync(CancellationToken stoppingToken)
	{
		using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
		while (await timer.WaitForNextTickAsync(stoppingToken))
		{
			try
			{
				await using var scope = scopes.CreateAsyncScope();
				var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
				await db.DeleteExpiredSessions(stoppingToken);
			}
			catch (Exception ex) when (ex is not OperationCanceledException)
			{
				logger.LogError(ex, "Cleanup failed");
			}
		}
	}
}

builder.Services.AddHostedService<CleanupWorker>();
```

```csharp title="After: Immediate.Jobs"
[Handler, Job(Name = "cleanup-sessions", Cron = "*/5 * * * *", OverlapPolicy = OverlapPolicy.Skip)]
public sealed partial class CleanupSessionsJob(AppDbContext db)
{
	private ValueTask HandleAsync(EmptyJobRequest request, CancellationToken cancellationToken) =>
		new(db.DeleteExpiredSessions(cancellationToken));
}
```

- The scope, the `try`/`catch` and the logging go away. Each run gets its own DI scope, failures
  are retried and logged, and every attempt is recorded for the
  [dashboard](/docs/Immediate.Jobs/dashboard-and-monitoring).
- A `PeriodicTimer` interval becomes a cron expression. Cron runs at fixed clock times (`:00`,
  `:05`, ...) instead of five minutes after the application started. Use a six-field expression
  such as `*/30 * * * * *` for intervals shorter than a minute.
- With durable storage and `UseDistributed()`, each run happens once across all instances instead
  of once per instance.
- `OverlapPolicy.Skip` keeps the old behavior of never running two cleanups at once. Choose
  `MisfireHandlingMode` for what should happen after downtime; the old loop simply started over.

## Channel-based queues

```csharp title="Before: BackgroundService"
public sealed class EmailQueue
{
	private readonly Channel<WelcomeEmail> _channel = Channel.CreateUnbounded<WelcomeEmail>();

	public ValueTask EnqueueAsync(WelcomeEmail email, CancellationToken token) =>
		_channel.Writer.WriteAsync(email, token);

	public IAsyncEnumerable<WelcomeEmail> ReadAllAsync(CancellationToken token) =>
		_channel.Reader.ReadAllAsync(token);
}

public sealed class EmailWorker(EmailQueue queue, IServiceScopeFactory scopes) : BackgroundService
{
	protected override async Task ExecuteAsync(CancellationToken stoppingToken)
	{
		await foreach (var email in queue.ReadAllAsync(stoppingToken))
		{
			await using var scope = scopes.CreateAsyncScope();
			var sender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
			await sender.SendAsync(email.UserId, email.Template, stoppingToken);
		}
	}
}
```

```csharp title="After: Immediate.Jobs"
[Handler, Job(Name = "send-welcome-email", MaxAttempts = 5)]
public sealed partial class SendWelcomeEmail(IEmailSender sender)
{
	public sealed record Payload(Guid UserId, string Template);

	private ValueTask HandleAsync(Payload payload, CancellationToken cancellationToken) =>
		new(sender.SendAsync(payload.UserId, payload.Template, cancellationToken));
}

// Inject SendWelcomeEmail.Scheduler where you injected EmailQueue.
await scheduler.EnqueueAsync(new(userId, "v2"), cancellationToken);
```

- The queue class, the worker and its registration are removed. The item type becomes the job's
  `Payload`.
- Items survive restarts once you choose a durable provider. With `UseInMemory()`, behavior matches
  the old in-memory channel.
- Several consumers reading from one channel become `WorkerCount`, `MaxConcurrency` on the job, or
  a [queue](/docs/Immediate.Jobs/queues-and-fairness) with its own `Concurrency`.
- A bounded channel used for back pressure has no direct equivalent: enqueueing always succeeds
  once the job is stored. Limit throughput with concurrency settings instead.
- Delayed retries implemented with `Task.Delay` become `Backoff` and `BackoffBase`. Work that must
  start later becomes `ScheduleAsync`.

## Retries, shutdown and health

| Hand-written                                | Immediate.Jobs                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| Retry loop with `Task.Delay`                | `MaxAttempts`, `Backoff`, `BackoffBase`                                |
| `CancellationTokenSource` with a timeout    | `Timeout` on `[Job]`                                                   |
| Waiting for work in `StopAsync`             | `ShutdownTimeout` drains claimed jobs before cancelling them           |
| Custom "last run" health check              | `AddHealthCheck()` storage and service checks                          |
| Logging around each item                    | Built-in logs, OpenTelemetry traces and metrics, or a handler behavior |
| Scoped services from `IServiceScopeFactory` | Constructor or `HandleAsync` parameters; each attempt gets a scope     |

<Callout type="tip" title="Keep BackgroundService for long-running loops">

Some hosted services are not jobs: a loop that holds a connection open, such as a message consumer
or a file watcher, still belongs in a `BackgroundService`. Have it enqueue a job for each unit of
work, so processing gets retries and monitoring.

</Callout>

## Migrate with an agent

<AgentPrompt title="Migrate hand-written workers with an AI agent">

```markdown
Replace this repository's hand-written background workers with Immediate.Jobs.

Guide: https://immediateplatform.dev/docs/Immediate.Jobs/migration/background-service
Documentation: https://immediateplatform.dev/docs/Immediate.Jobs/introduction
If the Immediate.Skills plugins are installed (immediate-jobs, immediate-handlers), use them.

Work in this order and stop for my confirmation after step 2:

1. Inventory. Find every BackgroundService and IHostedService, PeriodicTimer, System.Threading
   Timer, Task.Delay polling loop, Channel<T> or BlockingCollection<T> used as a work queue, and any
   hand-written retry, timeout or shutdown logic around them. Classify each as recurring work,
   queued work, or a long-running loop that is not a job (message consumers, file watchers).
2. Plan. For recurring and queued work, propose one [Handler, Job] class with a stable
   kebab-case Name and a Payload record (or EmptyJobRequest for recurring work). Translate timer
   intervals to Cron values, retry loops to MaxAttempts/Backoff/BackoffBase, timeouts to Timeout,
   and consumer counts to WorkerCount, MaxConcurrency or a [QueueDefinition]. Choose storage
   (UseDistributed if the app runs on several instances). Keep long-running loops as hosted
   services that enqueue jobs.
3. Implement. Add the job classes with private HandleAsync(payload, deps..., CancellationToken)
   returning ValueTask, replace queue writers with the generated Scheduler (EnqueueAsync,
   ScheduleAsync), delete the replaced workers, queues and their registrations, and register
   AddXxxHandlers() plus AddXxxJobs().ConfigureStorage(...). Add AddHealthCheck() if the app
   exposes health endpoints.
4. Test. Add JobTestHarness tests (Immediate.Jobs.Testing) per job: payload, execution, retries and
   recurring schedules with fake time. Build and run the tests.

Finish with a summary: workers replaced, workers kept and why, behavior differences (fixed clock
times instead of intervals, retries, multi-instance behavior), and open questions.
```

</AgentPrompt>
