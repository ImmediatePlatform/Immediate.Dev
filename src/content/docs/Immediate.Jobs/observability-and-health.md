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

| Instrument          | Type/unit          | Tags                               |
| ------------------- | ------------------ | ---------------------------------- |
| `jobs.enqueued`     | Counter            | `job.name`, `job.queue`            |
| `jobs.succeeded`    | Counter            | `job.name`, `job.queue`            |
| `jobs.failed`       | Counter            | `job.name`, `job.queue`            |
| `jobs.retried`      | Counter            | `job.name`, `job.queue`            |
| `job.duration`      | Histogram, seconds | `job.name`, `job.queue`, `outcome` |
| `acquisition.count` | Observable gauge   | none                               |
| `workers.active`    | Observable gauge   | none                               |

`acquisition.count` is the number of jobs the current node holds: running jobs plus claimed jobs
waiting for a worker. It is capped by `MaxAcquisitionCount`. `workers.active` is the number of jobs
running on the node. The gauges describe the current process, not every worker. Use provider
monitoring snapshots for stored totals across workers. Alert on growing pending totals, final
failures, retries and stale server heartbeats. Compare duration by job name and outcome.

## Structured logs

Worker logs carry the scope properties `JobName`, `QueueName`, `JobHandle` and `Attempt`. Events cover
scheduler loop failures, shutdown-drain timeout, unhandled worker errors, completion, retry,
attempt exhaustion, lease-renewal failures, recurring-run failures, missed recurring occurrences
and features that storage does not support. Include scopes in your logging output when you want to
search these fields.

Every event has a stable event ID and an event name prefixed with its package, such as
`Immediate.Jobs.Shared.RecurringOccurrencesMissed` or
`Immediate.Jobs.EntityFrameworkCore.AcquireDueJobsAsyncCalled`. Filter by name rather than by
number.

| First event ID | Package                                                       |
| -------------- | ------------------------------------------------------------- |
| `11000`        | `Immediate.Jobs` runtime, in-memory and single-server storage |
| `11500`        | `Immediate.Jobs.EntityFrameworkCore`                          |
| `11600`        | `Immediate.Jobs.LinqToDB`                                     |
| `11700`        | `Immediate.Jobs.Redis`                                        |

Storage providers log each storage call at `Debug` level. Enable `Debug` for the `Immediate.Jobs`
categories when you need to trace what the scheduler asks storage to do; leave it off in normal
production logging.

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

`AddHealthCheck` registers two checks that share the same failure status and tags:

| Check            | Reports                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `{name}-storage` | Whether the storage provider is reachable. Its data includes the storage capabilities.              |
| `{name}-service` | Whether the worker has started and sent a heartbeat within `ServerTimeout` (10 seconds by default). |

With the default name, the checks are `immediate-jobs-storage` and `immediate-jobs-service`. Filter
the readiness endpoint by the tag passed to `AddHealthCheck`. Until the worker starts, the service
check reports the failure status (`Unhealthy` unless you pass another `failureStatus`). When
`DisableWorkers()` is used, the service check always reports `Healthy`, so an enqueue-only
application is judged only by its storage connection. No extra options registration is needed; the
checks and worker use the same validated settings.

The Aspire sample shows the same tracing, metrics, health-check and dashboard-link setup. Aspire is
optional; Immediate.Jobs does not ship a separate Aspire runtime package.
