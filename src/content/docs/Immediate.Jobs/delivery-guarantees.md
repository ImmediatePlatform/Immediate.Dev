---
title: Delivery guarantees
description: Design idempotent jobs and understand states, retries, leases, shutdown and retention.
order: 12
group: Guides
---

Immediate.Jobs provides **at-least-once** execution. Persistence prevents acknowledged scheduling
from being silently forgotten by a durable provider, but no scheduler can atomically combine an
arbitrary external side effect with its own completion record.

## Make fulfillment idempotent

Use `JobDetails.JobId` or a domain key such as `OrderId + "confirmation"` in a unique database row.
Perform conditional state transitions (`Paid` → `Reserved`) and pass idempotency keys to payment,
email and shipping APIs. A retry should observe completed work and return successfully.

Immediate.Jobs does not ship a transactional outbox. When enqueue must be atomic with your
business transaction, implement an application-owned outbox and relay it to the generated
scheduler, accepting that the relay itself also needs idempotency.

## Lifecycle

| State                  | Meaning                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `AwaitingContinuation` | Waiting for parent jobs or a parent batch.                              |
| `AwaitingParameters`   | Reserved for future deferred-input work; currently never produced.      |
| `Scheduled`            | Persisted for a future `DueAt`.                                         |
| `Pending`              | Due for acquisition now.                                                |
| `Active`               | Acquired by a worker under a renewable lease.                           |
| `Succeeded`            | The attempt and completion transition succeeded.                        |
| `Failed`               | Attempts exhausted or an operator-visible terminal failure.             |
| `Cancelled`            | Terminal work stopped by an explicit cancellation, including a batch.   |
| `Skipped`              | Terminal work not selected by a continuation or recurring overlap rule. |

An acquisition increments `Attempt`. On failure, the worker calls `FailAsync` with either the next
retry time or no retry after `MaxAttempts`. Fixed and exponential backoff use `BackoffBase`;
exponential jitter spreads retries to avoid a synchronized surge.

Every acquisition also creates a retained `JobExecutionRecord`. Its state moves from `Active` to
`Succeeded`, `Failed` or `Cancelled`; an expired lease that is reacquired closes the old execution
as `Interrupted`. Each record keeps its one-based attempt number, worker, acquisition/start/end
times, trace/span identifiers and full error text. `JobRecord` continues to project the latest
attempt and telemetry fields. A best-effort execution derived from the owning job record is marked
`IsSynthetic`.

## Leases, timeouts and recovery

Distributed and replicated providers claim work atomically for `LeaseDuration` (30 seconds by
default), and the worker renews while running. If the process disappears, another worker can
recover the expired lease—possibly after the first process performed its side effect. `Timeout`
cancels the handler token; it is cooperative and does not forcibly stop managed code.

Storage fences worker-owned renewal, telemetry, completion and failure by job ID, attempt and
worker ID; active workflow expansion is fenced by job ID and attempt. A worker that loses its
lease—or whose job is explicitly cancelled—cannot later renew, complete, fail or expand the
current durable invocation even if the same worker ID reacquires it.

On graceful shutdown the scheduler stops acquiring, cancels attempts, renews/drains within
`ShutdownTimeout` (30 seconds), then returns control to the host. A hard stop relies on lease
expiry and recovery.

## History and operations

Defaults are 24 hours for succeeded jobs and batches; seven days for failed, cancelled or skipped
jobs and for failed or cancelled batches; and one hour between purge passes. Set
`SucceededRetention`, `FailedRetention`,
`BatchSucceededRetention`, `BatchFailedRetention` and `PurgeInterval` on
`ImmediateJobsOptions`. Zero retention is valid; negative retention is rejected.

Operators can cancel a non-terminal job through its generated scheduler, provider storage or the
dashboard. Cancellation records `Cancelled` immediately. An already-running handler is not forcibly
interrupted, but its stale terminal update is fenced. Operators can also retry a failed job, move a
scheduled invocation to `Pending` immediately, cancel a non-terminal batch and delete a terminal
batch. Provider storage additionally supports deleting a terminal individual job; the dashboard's
individual-job action is cancellation.

Fast-forwarding scheduled work preserves its attempt count and latest failure details. Terminal
records reject cancellation, while other incompatible delete/retry mutations fail with a conflict.
Execution history has the same retention lifetime as its owning job or batch. Batch deletion or
retention removes members, executions and edges as one unit.
