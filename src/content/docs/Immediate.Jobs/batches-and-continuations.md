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
support, which Redis does not provide. Inject the scoped `IBatchScheduler` alongside the generated
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

		var imported = import.AddToBatch(batch, new(importId));
		var indexed = await index.ScheduleAfterAsync(
			imported,
			new(importId),
			cancellationToken: cancellationToken
		);

		var notifyOwner = await notify.ScheduleAfterAsync(
			indexed,
			new(importId),
			cancellationToken: cancellationToken
		);
		var updateMetrics = await metrics.ScheduleAfterAsync(
			indexed,
			new(importId),
			cancellationToken: cancellationToken
		);

		_ = await finalize.ScheduleAfterAsync(
			[notifyOwner, updateMetrics],
			new(importId),
			cancellationToken: cancellationToken
		);

		return await batch.CommitAsync(cancellationToken);
	}
}
```

Within an open batch, `AddToBatch` and `AddToBatchAt` keep jobs in memory. Continuations created
from their handles stay in the same batch. `CommitAsync` saves the entire batch in one operation
and returns a `BatchHandle`. Nothing is visible before the commit.

`Begin()` returns the in-memory buffer shown above. Always dispose it: disposal without commit
abandons the buffer. A batch can commit only once and cannot be modified after commit. As an
alternative, `batches.RunAsync(body, cancellationToken)` creates the buffer, runs the body and
commits only when the body completes successfully.

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

var grouped = import.AddToBatchInGroup(batch, new(importId), tenantId);
var groupedAt = import.AddToBatchAt(batch, new(importId), runAt, tenantId);
```

`AddToBatchInGroup` also accepts an optional delay. A blank group ID means no group, and group IDs
cannot exceed 128 characters. The group changes scheduling order only when the storage provider
supports fair queues.

## Chains, fan-out and fan-in

`ScheduleAfterAsync(JobHandle, ...)` creates a chain. Pass a `ReadOnlySpan<JobHandle>` to wait for
all parents (fan-in), or create several children from one parent (fan-out). Duplicate parents and
handles from unrelated open batches are rejected. `ScheduleAfterAsync(BatchHandle, ...)` waits for
the entire prior batch. `batches.Begin(previousBatch, trigger)` creates a follow-up batch whose
root members all depend on it.

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
			command.JobDetails!,
			new(order.CustomerEmail, order.Summary),
			ContinuationOptions.BeforeContinuations
		);
	}
}
```

`ScheduleAfter` buffers work and persists it only if the current attempt succeeds. `AddToBatchAsync`
adds concurrent work immediately to the running batch. `ContinuationOptions` controls how that new
work relates to the current job's existing continuations:

| Option                          | Batch membership | Effect on existing continuations                                 |
| ------------------------------- | ---------------- | ---------------------------------------------------------------- |
| `Detached`                      | None             | Unchanged; valid only with `ScheduleAfter`.                      |
| `BesideContinuations`           | Current batch    | Unchanged; the new job forms a parallel branch.                  |
| `BeforeContinuations` (default) | Current batch    | They also wait for the new job, creating an additive dependency. |

The `BeforeContinuations` splice keeps each existing dependency on the current job and adds a
dependency on the new job. Existing continuations therefore wait for both jobs.

<Callout type="warning">

`JobDetails` expansion is valid only during the active attempt. It requires a graph provider and,
except for detached scheduling, the current job must belong to a batch. `IJOB0015` warns when
`Detached` is passed to `AddToBatchAsync`.

</Callout>

Use the scoped `JobMonitor` to read a graph. Call `GetBatchAsync`, `QueryBatchMembersAsync`, or
`GetBatchGraphAsync`. These methods return `null` when storage does not support graphs.
`BatchStatus` counts succeeded, failed, cancelled and skipped members separately. A batch can
succeed when every executed member succeeded even if conditional branches were skipped. The
concrete monitor also provides `CancelBatchAsync` for jobs that have not finished and
`DeleteBatchAsync` for a completed batch. The dashboard offers the same actions.
