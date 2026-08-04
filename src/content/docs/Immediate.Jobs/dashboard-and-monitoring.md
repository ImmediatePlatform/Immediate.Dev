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

Register the dashboard's generated API handlers before building the application, then map the
embedded UI and JSON/SSE API:

```csharp
using Immediate.Jobs.Dashboard;

var traceExplorer = new Uri("https://traces.example/");
var logExplorer = new Uri("https://logs.example/");

builder.Services.AddImmediateJobsDashboard(options =>
{
	_ = options.RequireAuthorization("operations");
	_ = options.AddTelemetryLink(
		"View execution trace",
		JobTelemetryLinkKind.Trace,
		context => context.Execution?.ExecutionTraceId is { } traceId
			? new(traceExplorer, $"trace/{traceId}")
			: null
	);
	_ = options.AddTelemetryLink(
		"View execution logs",
		JobTelemetryLinkKind.Logs,
		context => context.Execution is { } execution
			? new(logExplorer,
				$"search?jobId={Uri.EscapeDataString(context.Job.Id)}&attempt={execution.Attempt}")
			: null
	);
	_ = options.AddTelemetryLink(
		"View all retry logs",
		JobTelemetryLinkKind.Logs,
		context => context.Execution is null
			? new(logExplorer, $"search?jobId={Uri.EscapeDataString(context.Job.Id)}")
			: null
	);
});

var app = builder.Build();
app.MapImmediateJobsDashboard("/jobs");
```

Without `RequireAuthorization`, every dashboard endpoint is development-only and returns 403 in
other environments. Treat the dashboard as an administrative surface: it exposes payloads,
errors, identifiers and mutations. A named policy applies to UI assets and APIs together.

The UI shows queue/state totals, including skipped work, recent history, jobs and details,
recurring schedules, scheduler servers, batches and workflow graphs. Graph views appear only for
graph-capable storage.

## Dashboard UI

### Inspect jobs

The Jobs view lists durable invocations and their current state. Select a job to open its dedicated
detail route with payload data and a newest-first, collapsible timeline of retained executions.
Each execution records its attempt, state, worker, acquisition/start/completion times, trace/span
identifiers and full failure text. Failed jobs offer **Retry**; scheduled first attempts and delayed
retries offer **Run now**, which moves the existing invocation to `Pending` without changing its
attempt or failure history. Every non-terminal job offers a confirmation-backed **Cancel** action.

### Follow batch workflows

The Batches view visualizes the jobs in a batch and the continuations between them. Progress and
workflow nodes distinguish skipped conditional branches from explicitly cancelled work. Select a
node to inspect that job without losing the surrounding workflow context. Executing batches offer
a confirmation-backed **Cancel** action from their workflow details.

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

`AddTelemetryLink` adds application-defined destinations to job and execution details. The
dashboard evaluates its synchronous URL factory through the job-level or exact-execution telemetry
endpoint and supplies a `JobTelemetryLinkContext`.

| Argument    | Purpose                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `label`     | User-facing description of the destination.                                                           |
| `kind`      | `Trace` or `Logs`; controls how the dashboard identifies the link.                                    |
| `createUrl` | Builds the destination from `context.Job` and optional `context.Execution`; return `null` to hide it. |

For a job-level request, `context.Execution` is `null` and the execution fields on `context.Job`
describe the latest attempt. For an exact-execution request, `context.Execution` contains the
selected retained record; `context.Job.Attempt`, `ExecutionTraceId`, `ExecutionSpanId` and
`ExecutionStartedAt` also represent that same attempt. Use `Execution` for per-attempt trace/log
links, and use `Job.Id` when a destination should search across every retry.

Factories may return HTTP(S) or dashboard-relative URLs. Other absolute URI schemes are rejected
when the endpoint evaluates the link. Return `null` before an execution trace exists or whenever a
destination does not apply to the current record.

## HTTP endpoints

All paths below are relative to the mapped prefix.

| Method and path                                                      | Purpose                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `GET /api/overview`                                                  | Monitoring snapshot and storage capabilities.                            |
| `GET /api/jobs`                                                      | Filter by `state`, `queue`, `search`; `skip`; `take` 1–200 (default 50). |
| `GET /api/jobs/{jobId}`                                              | Latest durable record.                                                   |
| `GET /api/jobs/{jobId}/executions`                                   | Retained attempts newest first; `skip`; `take` 1–200 (default 50).       |
| `GET /api/jobs/{jobId}/telemetry-links`                              | Configured job-level trace/log destinations.                             |
| `GET /api/jobs/{jobId}/executions/{executionNumber}/telemetry-links` | Configured destinations for one retained execution.                      |
| `POST /api/jobs/{jobId}/cancel`                                      | Cancel non-terminal work.                                                |
| `POST /api/jobs/{jobId}/retry`                                       | Retry failed work or run scheduled work now.                             |
| `GET /api/recurring`                                                 | Recurring schedules.                                                     |
| `POST /api/recurring/{name}/trigger`                                 | Materialize an immediate invocation.                                     |
| `POST /api/recurring/{name}/pause` / `resume`                        | Change schedule state.                                                   |
| `GET /api/servers`                                                   | Worker heartbeat snapshots.                                              |
| `GET /api/batches`                                                   | Filter by `state`, `skip`, `take` 1–500 (default 100).                   |
| `GET /api/batches/{id}`                                              | Aggregate status.                                                        |
| `GET /api/batches/{id}/members`                                      | Filtered/paged member status.                                            |
| `GET /api/batches/{id}/graph`                                        | Dependency graph.                                                        |
| `POST /api/batches/{id}/cancel`                                      | Cascade-cancel unsettled members.                                        |
| `DELETE /api/batches/{id}`                                           | Delete a terminal graph.                                                 |
| `GET /api/events`                                                    | SSE `state` snapshots at `UpdateInterval`.                               |
| `GET /api/batches/{id}/stream`                                       | SSE `status` and `graph` events on change.                               |

Successful cancel, retry, pause, resume and batch mutations return `204`; recurring trigger returns
`202`. A request returns `400` Validation Problem Details for invalid route or paging values, `404`
when its job, execution, batch or recurring schedule does not exist (or the provider lacks the
required capability), and `409` when a mutation targets a resource whose lifecycle state does not
allow the operation.

SSE sends `retry: 3000`, disables proxy buffering and ends when the request is aborted. It is a
poll-backed live view, not a durable event log; clients must refresh after reconnecting.

## Programmatic monitoring

Inject scoped `IJobMonitor` and call `GetJobAsync`. With a graph provider, inject
`IJobBatchMonitor` and call `GetStatusAsync`, `QueryMembersAsync`, or `GetGraphAsync`. These are
read-only contracts suitable for application status endpoints. Custom operational views can query
newest-first attempts through `IJobStorage.QueryJobExecutionsAsync`; the execution history remains
with its owning job or batch until that aggregate is deleted or purged.

Monitoring snapshots include only scheduler servers whose last heartbeat is at most two minutes
old. SQL providers prune stale server rows on later heartbeats, while Redis expires their hashes.

<Callout type="note">

The dashboard calls storage query APIs directly. Apply paging and authorization to any custom
monitoring endpoint too; payload and exception data can contain business-sensitive values.

</Callout>
