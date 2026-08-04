---
title: Observability and health
description: Export Immediate.Jobs traces, metrics and structured logs, and register scheduler health checks.
order: 14
group: Guides
---

Immediate.Jobs exposes both an `ActivitySource` and `Meter` named `Immediate.Jobs`:

```csharp
builder.Services.AddOpenTelemetry()
	.WithTracing(tracing => tracing.AddSource("Immediate.Jobs"))
	.WithMetrics(metrics => metrics.AddMeter("Immediate.Jobs"));
```

Each execution creates a consumer activity named `job {job.name}` with `job.name`, `job.queue`,
`job.id` and `job.attempt`. Enqueue trace context is persisted and linked to the execution rather
than used as its parent, so asynchronous work remains causally visible without pretending to be a
single synchronous span. Every acquired attempt retains its trace/span IDs, timing, worker, outcome
and full failure text for the lifetime of its owning job or batch. The latest values remain on
`JobRecord` as the latest-execution projection, while the dashboard can build links for an exact
`JobExecutionRecord`.

## Metrics

| Instrument       | Type/unit          | Tags                               |
| ---------------- | ------------------ | ---------------------------------- |
| `jobs.enqueued`  | Counter            | `job.name`, `job.queue`            |
| `jobs.succeeded` | Counter            | `job.name`, `job.queue`            |
| `jobs.failed`    | Counter            | `job.name`, `job.queue`            |
| `jobs.retried`   | Counter            | `job.name`, `job.queue`            |
| `job.duration`   | Histogram, seconds | `job.name`, `job.queue`, `outcome` |
| `queue.depth`    | Observable gauge   | none                               |
| `workers.active` | Observable gauge   | none                               |

The gauges are local runtime observations, not authoritative cluster totals. Use provider
monitoring snapshots for durable/cluster state. Alert on growing queue depth, exhausted failures,
retries and stale server heartbeats; interpret duration by job name and outcome.

## Structured logs

Worker logs carry the scope properties `JobName`, `QueueName`, `JobId` and `Attempt`. Events cover
scheduler iteration failure, shutdown-drain timeout, unhandled worker errors, completion, retry,
attempt exhaustion and disabled optional capabilities. Include scopes in the logging exporter to
make these fields queryable.

## Health checks

```csharp
builder.Services.AddMyAppJobs(options => options.UseEntityFrameworkCore<AppDbContext>())
	.AddHealthCheck(name: "my-app-jobs", tags: ["ready"]);

app.MapHealthChecks("/health/ready");
```

The check combines scheduler liveness with provider connectivity. Choose a `failureStatus` when
degraded versus unhealthy behavior matters to orchestration. The Aspire sample uses the same
OpenTelemetry sources, health registration and dashboard telemetry-link hooks; Immediate.Jobs
does not require Aspire and does not ship an Aspire-specific runtime package.
