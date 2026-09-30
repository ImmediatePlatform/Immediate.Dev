---
title: Batches and continuations
description: Create batches, continuations, parallel branches and workflows that add jobs while running.
order: 7
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Batches save jobs and their dependencies in one operation. They require storage with graph
support, which Redis does not provide. Inject the singleton `IBatchScheduler` alongside the generated
job schedulers.

## Create a batch

Inject `IBatchScheduler` and the generated scheduler for each job in the workflow:

```csharp
public sealed class ImportWorkflow(
	IBatchScheduler batches,
	ImportData.Scheduler import,
	BuildIndex.Scheduler index,
	NotifyOwner.Scheduler notify,
	UpdateMetrics.Scheduler metrics,
	FinalizeImport.Scheduler finalize
)
{
	public async ValueTask<BatchHandle> StartAsync(
		Guid importId,
		CancellationToken cancellationToken
	)
	{
		await using var batch = batches.Begin();

		var imported = import.Enqueue(new(importId), batch);
		var indexed = index.ScheduleAfter(new(importId), imported);

		var notifyOwner = notify.ScheduleAfter(new(importId), indexed);
		var updateMetrics = metrics.ScheduleAfter(new(importId), indexed);

		_ = finalize.ScheduleAfter(new(importId), [notifyOwner, updateMetrics]);

		return await batch.CommitAsync(cancellationToken);
	}
}
```

Within an open batch, `Enqueue`, `Schedule` and `ScheduleAfter` are synchronous because they only
write to the in-memory buffer. They return `BatchJobHandle`, which keeps each dependency tied to
its batch. `CommitAsync` saves the jobs and edges in one operation and returns a `BatchHandle`.
Nothing is visible before the commit.

`BatchJobHandle.JobHandle` returns the durable `JobHandle` after a successful commit. Reading it before
commit throws `InvalidOperationException`. This keeps in-progress batch handles out of APIs that
accept already durable jobs and batches.

`Begin()` returns the in-memory buffer shown above. Always dispose it: disposal without commit
abandons the buffer. A batch can commit only once and cannot be modified after commit. As an
alternative, `batches.RunAsync(body, cancellationToken)` creates the buffer, runs the body and
commits only when the body completes successfully.

Keep the builder short-lived and use it from one control flow. `Batch` is not thread-safe, so do
not add members concurrently with `Task.WhenAll` or share an open batch between requests.

Cancel every non-terminal member of a committed batch through the same batch scheduler:

```csharp
BatchHandle handle = await workflow.StartAsync(importId, cancellationToken);
await batches.CancelAsync(handle, cancellationToken);
```

This includes scheduled, active and continuation-waiting jobs. The batch becomes `Cancelled` after
every job reaches a final state. Cancelling an active job saves the cancellation but does not
forcibly stop handler code that is already running. If that code finishes later, it cannot
overwrite the cancelled result.

A failure before `CommitAsync` begins saves nothing. Once the commit begins, the batch closes even
if the call throws. If the storage connection fails during the commit, the caller may not know
whether the batch was saved. Do not reuse the same `Batch`. If you create another batch, guard
against running the work twice.

Batch members can carry the same fair-queue group IDs as ordinary scheduled work:

```csharp
var tenantId = "tenant-42";
var runAt = DateTimeOffset.UtcNow.AddMinutes(5);

var grouped = import.Enqueue(new(importId), batch, tenantId);
var groupedAt = import.Schedule(new(importId), batch, runAt, tenantId);
```

Use the `Schedule` overload with `TimeSpan` for a delayed batch member. A blank group ID means no
group, and group IDs cannot exceed 128 characters. The group changes scheduling order only when
the storage provider supports fair queues.

## Chains, fan-out and fan-in

Inside an open batch, `ScheduleAfter(payload, BatchJobHandle, ...)` creates a chain. Pass an
`IReadOnlyList<BatchJobHandle>` to wait for all parents, or create several children from one parent
for fan-out. Every parent must belong to the same open batch, and duplicates are rejected.

Outside an open batch, `ScheduleAfterAsync(payload, ContinuationHandle, ...)` accepts either a
durable `JobHandle` or `BatchHandle`. Its list overload can wait for any mix of durable jobs and
batches. `batches.Begin(previousBatch, trigger)` creates a follow-up batch whose root members all
depend on one batch. Pass an `IReadOnlyList<BatchHandle>` to wait for several prior batches.

```csharp
// These handles came from earlier scheduling calls and batch commits.
var verified = await verify.ScheduleAfterAsync(
	new(importId),
	importedJob,
	TimeSpan.FromMinutes(5),
	cancellationToken: cancellationToken
);

var published = await publish.ScheduleAfterAsync(
	new(importId),
	[verified, previousBatch],
	cancellationToken: cancellationToken
);

await using var followUp = batches.Begin(
	[firstBatch, secondBatch],
	ContinuationTrigger.Complete
);
_ = publish.Enqueue(new(importId), followUp);
_ = await followUp.CommitAsync(cancellationToken);
```

Continuation overloads with a delay start that delay when every parent reaches the required
outcome. Time spent waiting for a parent does not consume the delay.

| `ContinuationTrigger` | Condition and unmatched outcome                                                      |
| --------------------- | ------------------------------------------------------------------------------------ |
| `Success`             | Released when every parent succeeds; skipped when a parent settles unsuccessfully.   |
| `Failure`             | Released after every parent settles if at least one failed; otherwise skipped.       |
| `Complete`            | Released after every parent reaches any terminal state; it has no unmatched outcome. |

For a continuation attached to a `BatchHandle`, the batch is one parent. It becomes `Failed` after
all of its items finish when **any item failed**, so a `Failure` continuation is released in that
case. Explicitly cancelled items alone make the batch `Cancelled`, while skipped branches do not
fail the batch. Neither outcome satisfies `Failure`. Conditional branches that are not selected
become terminal `Skipped` records, and skipping propagates through descendants whose own triggers
cannot be satisfied.

## Expanding a running workflow

Implement `IJobRequest` to receive `JobDetails`, then use a generated scheduler:

```csharp
[Handler, Job]
public sealed partial class ProcessOrder(SendEmail.Scheduler sendEmail)
{
	public sealed record Command(Guid OrderId) : IJobRequest
	{
		public JobDetails? JobDetails { get; set; }
	}

	private async ValueTask HandleAsync(Command command, CancellationToken cancellationToken)
	{
		var order = await LoadOrderData(command.OrderId, cancellationToken);

		_ = sendEmail.ScheduleAfter(
			new(order.CustomerEmail, order.Summary),
			command.JobDetails!,
			ContinuationOptions.BeforeContinuations
		);
	}
}
```

`ScheduleAfter` buffers work and persists it only if the current attempt succeeds.
`EnqueueAsync(payload, JobDetails, ...)` adds concurrent work immediately to the running batch.
Use `ScheduleAsync` with `JobDetails` to delay that concurrent work or give it an absolute run time.
`ContinuationOptions` controls how the new work relates to the current job's existing
continuations:

| Option                          | Batch membership | Effect on existing continuations                                 |
| ------------------------------- | ---------------- | ---------------------------------------------------------------- |
| `Detached`                      | None             | Unchanged; valid only with `ScheduleAfter`.                      |
| `BesideContinuations`           | Current batch    | Unchanged; the new job forms a parallel branch.                  |
| `BeforeContinuations` (default) | Current batch    | They also wait for the new job, creating an additive dependency. |

With `BeforeContinuations`, each existing follow-up job waits for both the current job and the new
job.

<Callout type="warning">

`JobDetails` expansion is valid only during the active attempt. It requires a graph provider and,
except for detached scheduling, the current job must belong to a batch. `IJOB0015` warns when
`Detached` is passed to `EnqueueAsync` or `ScheduleAsync` with `JobDetails`.

</Callout>

Use the singleton `JobMonitor` to read a graph. Call `GetBatchAsync`, `QueryBatchMembersAsync`, or
`GetBatchGraphAsync`. These methods return `null` when storage does not support graphs.
`BatchStatus` counts succeeded, failed, cancelled and skipped members separately. A batch can
succeed when every executed member succeeded even if conditional branches were skipped. The
concrete monitor also provides `CancelBatchAsync` for jobs that have not finished and
`DeleteBatchAsync` for a completed batch. The dashboard offers the same actions.
