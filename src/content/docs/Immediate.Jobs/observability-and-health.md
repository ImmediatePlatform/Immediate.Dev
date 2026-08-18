---
title: Observability and health
description: Export traces, metrics and logs, and add scheduler health checks.
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
builder.Services.AddMyAppJobs()
	.ConfigureStorage(storage => storage
		.UseEntityFrameworkCore<AppDbContext>()
		.UseDistributed())
	.AddHealthCheck(name: "my-app-jobs", tags: ["ready"]);

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
	Predicate = registration => registration.Tags.Contains("ready"),
	ResultStatusCodes =
	{
		[HealthStatus.Degraded] = StatusCodes.Status503ServiceUnavailable,
		[HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable,
	},
});
```

The check covers both the worker and its storage connection. Filter the readiness endpoint by the
tag passed to `AddHealthCheck`. It reports `Degraded` until the worker starts, so map that status to
HTTP 503 when the application should not receive traffic during startup. No extra options
registration is needed; the check and worker use the same validated settings.

The Aspire sample shows the same tracing, metrics, health-check and dashboard-link setup. Aspire is
optional; Immediate.Jobs does not ship a separate Aspire runtime package.
