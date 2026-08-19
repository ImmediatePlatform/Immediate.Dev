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
`job.id` and `job.attempt`. Jobs saves the trace context from the scheduling call and links it to
the later execution trace. It does not make the scheduling call the parent because the job runs
asynchronously. Each attempt stores its trace and span IDs, timing, worker, outcome and full failure
text until its job or batch is deleted. `JobRecord` holds the latest attempt. The dashboard uses
`JobExecutionRecord` when it needs one specific attempt.

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

The gauges describe the current process, not every worker. Use provider monitoring snapshots for
stored totals across workers. Alert on growing queue depth, final failures, retries and stale server
heartbeats. Compare duration by job name and outcome.

## Structured logs

Worker logs carry the scope properties `JobName`, `QueueName`, `JobId` and `Attempt`. Events cover
scheduler iteration failure, shutdown-drain timeout, unhandled worker errors, completion, retry,
attempt exhaustion and features that storage does not support. Include scopes in your logging
output when you want to search these fields.

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
