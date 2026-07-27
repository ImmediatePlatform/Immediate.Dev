---
title: Enqueueing and scheduling
description: Use generated schedulers for immediate, delayed, absolute and fair-group work.
order: 3
group: Guides
---

Each generated `JobName.Scheduler` is registered as **scoped**. Inject it into an endpoint,
handler or scoped application service; do not capture it in a singleton.

```csharp
public sealed class SignupService(SendWelcomeEmail.Scheduler welcomeEmail)
{
	public ValueTask<JobHandle> EnqueueAsync(Guid userId, CancellationToken cancellationToken) =>
		welcomeEmail.EnqueueAsync(new(userId, "v2"), cancellationToken);
}
```

## Scheduling forms

```csharp
var payload = new SendWelcomeEmail.Payload(userId, "v2");

JobHandle now = await scheduler.EnqueueAsync(payload, cancellationToken);
JobHandle later = await scheduler.ScheduleAsync(payload, TimeSpan.FromMinutes(10), cancellationToken);
JobHandle at = await scheduler.ScheduleAtAsync(payload, shipAt, cancellationToken);
```

Negative delays throw `ArgumentOutOfRangeException`. Absolute times are `DateTimeOffset`; the
storage layer compares them in UTC. Enqueue and schedule return after persistence, not execution.

## Fair-group scheduling

When fair queues are enabled, pass a stable tenant or customer ID to the overloads with
`groupId`:

```csharp
await scheduler.EnqueueAsync(payload, groupId: tenantId, cancellationToken);
await scheduler.ScheduleAsync(payload, TimeSpan.FromMinutes(5), tenantId, cancellationToken);
await scheduler.ScheduleAtAsync(payload, shipAt, tenantId, cancellationToken);
```

Whitespace is normalized to no group. Group IDs longer than 128 characters are rejected. A
non-empty group is persisted even without `options.UseFairQueues()`; in that case it does not
affect order and the worker logs one warning. Enabling fair acquisition requires a supporting
provider; Redis rejects fair acquisition.

Because schedulers are scoped, a singleton worker creates a scope for each unit of work:

```csharp
public sealed class ImportWorker(IServiceScopeFactory scopeFactory)
{
	public async ValueTask EnqueueAsync(Guid importId, CancellationToken cancellationToken)
	{
		await using var scope = scopeFactory.CreateAsyncScope();
		var scheduler = scope.ServiceProvider.GetRequiredService<ImportJob.Scheduler>();
		await scheduler.EnqueueAsync(new(importId), cancellationToken);
	}
}
```

## Custom identifiers

Immediate.Jobs creates job and batch IDs before writing them to storage. The default
`IIdGenerator` returns a 32-character GUID string without separators. Replace it when your
platform uses Snowflake, ULID or another globally unique string format:

```csharp
builder.Services.AddMyAppJobs(options => options.UseInMemory())
	.UseIdGenerator<SnowflakeIdGenerator>();

// ISnowflakeService is supplied and registered by your chosen Snowflake implementation.
public sealed class SnowflakeIdGenerator(ISnowflakeService snowflakes) : IIdGenerator
{
	public string CreateId(IdKind kind)
	{
		var prefix = kind switch
		{
			IdKind.Job => "job",
			IdKind.Batch => "batch",
			_ => throw new ArgumentOutOfRangeException(nameof(kind)),
		};

		return $"{prefix}_{snowflakes.GenerateSnowflakeId()}";
	}
}
```

`UseIdGenerator<TGenerator>()` registers `TGenerator` as a singleton, so its implementation and
dependencies must be thread-safe. With distributed storage, configure Snowflake worker/node IDs
so separate application instances cannot generate the same value. `IdKind` lets the generator
distinguish individual job invocations—including recurring occurrences—from atomic batches.

Treat the result as opaque even when your generator adds a readable prefix. Applications should
store and compare `JobHandle.Id` or `BatchHandle.Id`, not parse business meaning from their format.

## Handles and cancellation

`JobHandle.Id` is the generated invocation identifier. A handle also carries an internal batch
scope while building a workflow and therefore should not be serialized as a durable business
contract.

Ordinary schedulers do not expose a cancellation method. Operational cancellation is available
for a whole batch, while a single terminal job can be deleted and a failed job retried through
storage operations or the dashboard. Cancellation tokens on scheduling calls cancel the storage
operation only; they do not become a future execution-cancellation token.
