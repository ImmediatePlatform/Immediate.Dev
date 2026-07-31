---
title: Batches and continuations
description: Build atomic job graphs, chains, fan-out/fan-in and dynamically expanded workflows.
order: 7
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Batches persist jobs and their dependency edges atomically. They require a graph-capable
provider; Redis exposes queue and recurring capabilities only. Resolve the scoped
`IJobBatchScheduler` from DI, normally through constructor injection alongside the generated job
schedulers.

## Atomic workflow graph

The constructor below makes every receiver explicit: `batches` is the runtime batch scheduler;
the other parameters are nested scheduler types generated for their corresponding job classes.

```csharp
public sealed class ImportWorkflow(
	IJobBatchScheduler batches,
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

Within an open batch, `AddToBatch` and `AddToBatchAt` only buffer records. Continuations built from
their handles remain in the same buffer. `CommitAsync` performs one atomic graph write and returns
a `BatchHandle`; nothing becomes visible before commit.

`Begin()` returns the in-memory buffer shown above. Always dispose it: disposal without commit
abandons the buffer. A batch can commit only once and cannot be modified after commit. As an
alternative, `batches.RunAsync(body, cancellationToken)` creates the buffer, runs the body and
commits only when the body completes successfully.

Failures before `CommitAsync` begins write nothing. Once commit begins, however, the batch is
closed even when the call throws, and a transport failure can leave the durable outcome unknown:
storage may have committed the graph before the caller lost the response. Do not retry the same
`JobBatch`; an operation that rebuilds and commits another batch needs application-level
idempotency or duplicate tracking.

Batch members can carry the same fair-queue group IDs as ordinary scheduled work:

```csharp
var tenantId = "tenant-42";
var runAt = DateTimeOffset.UtcNow.AddMinutes(5);

var grouped = import.AddToBatchInGroup(batch, new(importId), tenantId);
var groupedAt = import.AddToBatchAt(batch, new(importId), runAt, tenantId);
```

`AddToBatchInGroup` also accepts an optional delay. Whitespace group IDs are normalized to no
group, the 128-character limit still applies, and the configured provider must support fair
acquisition for the group to affect dispatch order.

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

Monitor a graph through `IJobBatchMonitor.GetStatusAsync`, `QueryMembersAsync` and `GetGraphAsync`.
`BatchStatus` counts succeeded, failed, cancelled and skipped members separately; a batch can
succeed when every executed member succeeded even if conditional branches were skipped. The
dashboard exposes the same progress and workflow states alongside batch cancel/delete operations.
