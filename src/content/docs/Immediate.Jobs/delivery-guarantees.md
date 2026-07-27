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

| State                  | Meaning                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `Pending`              | Due for acquisition now.                                    |
| `Scheduled`            | Persisted for a future `DueAt`.                             |
| `AwaitingContinuation` | Waiting for parent jobs or a parent batch.                  |
| `Processing`           | Acquired by a worker under a renewable lease.               |
| `Succeeded`            | The attempt and completion transition succeeded.            |
| `Failed`               | Attempts exhausted or an operator-visible terminal failure. |
| `Cancelled`            | Cascade- or batch-cancelled terminal work.                  |

An acquisition increments `Attempt`. On failure, the worker calls `FailAsync` with either the next
retry time or no retry after `MaxAttempts`. Fixed and exponential backoff use `BackoffBase`;
exponential jitter spreads retries to avoid a synchronized surge.

## Leases, timeouts and recovery

Distributed and replicated providers claim work atomically for `LeaseDuration` (30 seconds by
default), and the worker renews while running. If the process disappears, another worker can
recover the expired lease—possibly after the first process performed its side effect. `Timeout`
cancels the handler token; it is cooperative and does not forcibly stop managed code.

On graceful shutdown the scheduler stops acquiring, cancels attempts, renews/drains within
`ShutdownTimeout` (30 seconds), then returns control to the host. A hard stop relies on lease
expiry and recovery.

## History and operations

Defaults are 24 hours for succeeded jobs/batches, seven days for failed or cancelled jobs/batches,
and one hour between purge passes. Set `SucceededRetention`, `FailedRetention`,
`BatchSucceededRetention`, `BatchFailedRetention` and `PurgeInterval` on
`ImmediateJobsOptions`. Zero retention is valid; negative retention is rejected.

Operators can retry a failed job, delete a terminal job, cancel a non-terminal batch and delete a
terminal batch through provider operations or the dashboard. Active/non-terminal records reject
unsafe delete/retry mutations with a conflict. Batch retention removes its members and edges as a
unit.
