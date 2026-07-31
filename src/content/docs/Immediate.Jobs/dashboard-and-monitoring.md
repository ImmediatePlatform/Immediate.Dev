---
title: Dashboard and monitoring
description: Secure the embedded dashboard and use its HTTP and programmatic monitoring APIs.
order: 13
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

```bash
dotnet add package Immediate.Jobs.Dashboard --prerelease
```

Map the embedded UI and JSON/SSE API in an ASP.NET Core application:

```csharp
using Immediate.Jobs.Dashboard;

var traceExplorer = new Uri("https://traces.example/");
var logExplorer = new Uri("https://logs.example/");

app.MapImmediateJobsDashboard("/jobs", options =>
{
	_ = options.RequireAuthorization("operations");
	_ = options.AddTelemetryLink(
		"View latest trace",
		JobTelemetryLinkKind.Trace,
		context => context.Job.ExecutionTraceId is { } traceId
			? new(traceExplorer, $"trace/{traceId}")
			: null
	);
	_ = options.AddTelemetryLink(
		"View all retry logs",
		JobTelemetryLinkKind.Logs,
		context => new(logExplorer,
			$"search?jobId={Uri.EscapeDataString(context.Job.Id)}")
	);
});
```

Without `RequireAuthorization`, every dashboard endpoint is development-only and returns 403 in
other environments. Treat the dashboard as an administrative surface: it exposes payloads,
errors, identifiers and mutations. A named policy applies to UI assets and APIs together.

The UI shows queue/state totals, including skipped work, recent history, jobs and details,
recurring schedules, scheduler servers, batches and workflow graphs. Graph views appear only for
graph-capable storage.

## Dashboard UI

### Inspect jobs

The Jobs view lists recent executions and their current state. Select a job to inspect its
invocation, execution metadata, payload, errors and any application-defined telemetry links.
Failed jobs offer **Retry**; scheduled first attempts and delayed retries offer **Run now**, which
moves the existing invocation to `Pending` without changing its attempt or failure history.

<figure class="not-prose my-8">
    <img
        src="/images/immediate-jobs/dashboard/jobs-light.png"
        alt="The Immediate.Jobs dashboard Jobs view in light mode, with a succeeded job expanded to show its details"
        width="1713"
        height="999"
        loading="lazy"
        decoding="async"
        class="block w-full rounded-xl border border-border shadow-sm dark:hidden"
    />
    <img
        src="/images/immediate-jobs/dashboard/jobs-dark.png"
        alt="The Immediate.Jobs dashboard Jobs view in dark mode, with a succeeded job expanded to show its details"
        width="1713"
        height="999"
        loading="lazy"
        decoding="async"
        class="hidden w-full rounded-xl border border-border shadow-sm dark:block"
    />
    <figcaption class="mt-3 text-center text-sm text-muted-foreground">
        Job history with an expanded invocation, execution metadata, payload and telemetry links.
    </figcaption>
</figure>

### Follow batch workflows

The Batches view visualizes the jobs in a batch and the continuations between them. Progress and
workflow nodes distinguish skipped conditional branches from explicitly cancelled work. Select a
node to inspect that job without losing the surrounding workflow context.

<figure class="not-prose my-8">
    <img
        src="/images/immediate-jobs/dashboard/batch-workflow-light.png"
        alt="The Immediate.Jobs dashboard batch workflow graph in light mode, showing succeeded jobs and their continuations"
        width="1728"
        height="999"
        loading="lazy"
        decoding="async"
        class="block w-full rounded-xl border border-border shadow-sm dark:hidden"
    />
    <img
        src="/images/immediate-jobs/dashboard/batch-workflow-dark.png"
        alt="The Immediate.Jobs dashboard batch workflow graph in dark mode, showing succeeded jobs and their continuations"
        width="1728"
        height="999"
        loading="lazy"
        decoding="async"
        class="hidden w-full rounded-xl border border-border shadow-sm dark:block"
    />
    <figcaption class="mt-3 text-center text-sm text-muted-foreground">
        A batch workflow graph with continuation relationships and job details available in place.
    </figcaption>
</figure>

## Telemetry links

`AddTelemetryLink` adds an application-defined destination to each job's detail view. The
dashboard evaluates its synchronous URL factory when
`GET /api/jobs/{jobId}/telemetry-links` is requested and supplies a `JobTelemetryLinkContext`
containing the latest persisted `JobRecord`.

| Argument    | Purpose                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------- |
| `label`     | User-facing description of the destination.                                              |
| `kind`      | `Trace` or `Logs`; controls how the dashboard identifies the link.                       |
| `createUrl` | Builds the destination from `context.Job`; return `null` to hide it for that invocation. |

`ExecutionTraceId`, `ExecutionSpanId`, `ExecutionStartedAt` and `Attempt` describe the latest
execution attempt. A trace link therefore normally targets that attempt. By contrast, construct a
log search from `Job.Id` to find every retry because each attempt's structured logging scope
contains `JobName`, `JobId` and `Attempt`.

Factories may return HTTP(S) or dashboard-relative URLs. Other absolute URI schemes are rejected
when the endpoint evaluates the link. Return `null` before an execution trace exists or whenever a
destination does not apply to the current record.

## HTTP endpoints

All paths below are relative to the mapped prefix.

| Method and path                               | Purpose                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `GET /api/overview`                           | Monitoring snapshot and storage capabilities.                            |
| `GET /api/jobs`                               | Filter by `state`, `queue`, `search`; `skip`; `take` 1–200 (default 50). |
| `GET /api/jobs/{jobId}`                       | Latest durable record.                                                   |
| `GET /api/jobs/{jobId}/telemetry-links`       | Configured trace/log destinations.                                       |
| `POST /api/jobs/{jobId}/retry`                | Retry failed work or run scheduled work now.                             |
| `DELETE /api/jobs/{jobId}`                    | Delete terminal work.                                                    |
| `GET /api/recurring`                          | Recurring schedules.                                                     |
| `POST /api/recurring/{name}/trigger`          | Materialize an immediate invocation.                                     |
| `POST /api/recurring/{name}/pause` / `resume` | Change schedule state.                                                   |
| `GET /api/servers`                            | Worker heartbeat snapshots.                                              |
| `GET /api/batches`                            | Filter by `state`, `skip`, `take` 1–500 (default 100).                   |
| `GET /api/batches/{id}`                       | Aggregate status.                                                        |
| `GET /api/batches/{id}/members`               | Filtered/paged member status.                                            |
| `GET /api/batches/{id}/graph`                 | Dependency graph.                                                        |
| `POST /api/batches/{id}/cancel`               | Cascade-cancel unsettled members.                                        |
| `DELETE /api/batches/{id}`                    | Delete a terminal graph.                                                 |
| `GET /api/events`                             | SSE `state` snapshots at `UpdateInterval`.                               |
| `GET /api/batches/{id}/stream`                | SSE `status` and `graph` events on change.                               |

Successful retry, delete, pause, resume and batch mutations return `204`; recurring trigger returns
`202`. A mutation returns `404` when its job, batch or recurring schedule does not exist (or the
provider lacks the required capability), and `409` when the resource exists but its lifecycle
state does not allow the operation.

SSE sends `retry: 3000`, disables proxy buffering and ends when the request is aborted. It is a
poll-backed live view, not a durable event log; clients must refresh after reconnecting.

## Programmatic monitoring

Inject scoped `IJobMonitor` and call `GetJobAsync`. With a graph provider, inject
`IJobBatchMonitor` and call `GetStatusAsync`, `QueryMembersAsync`, or `GetGraphAsync`. These are
read-only contracts suitable for application status endpoints.

<Callout type="note">

The dashboard calls storage query APIs directly. Apply paging and authorization to any custom
monitoring endpoint too; payload and exception data can contain business-sensitive values.

</Callout>
