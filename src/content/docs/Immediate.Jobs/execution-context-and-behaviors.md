---
title: Execution context and behaviors
description: Run jobs through Immediate.Handlers pipelines and propagate selected scoped context safely.
order: 8
group: Guides
---

The generated invoker deserializes the payload, assigns `JobDetails` when the request implements
`IJobRequest`, resolves the generated handler from a fresh DI scope, and calls its
Immediate.Handlers pipeline. Assembly-wide `[Behaviors]`, handler dependencies and scoped
services therefore work exactly as they do for direct dispatch.

Behavior exceptions fail the attempt and use the job's retry policy. Serialization, context
restore and handler exceptions share that retry boundary. Each attempt gets a new service scope.

## Invocation metadata

`JobDetails` contains `JobId`, `JobName`, `QueueName`, one-based `Attempt`, `CreatedAt`,
`ScheduledAt` and optional `BatchId`. Use it for idempotency keys, diagnostics and workflow
expansion; do not change its `Buffer` plumbing.

## Capture selected ambient context

The repository's reusable extractor pattern separates the durable snapshot from the scoped
application service:

```csharp
// Durable data serialized into the job's context envelope.
public sealed record UsageContextSnapshot(Guid UserId, string TenantId);

// Application-owned scoped state used by request and job code.
public sealed class UsageContext
{
	public UsageContextSnapshot? Value { get; set; }
}

public sealed class UsageContextExtractor(UsageContext usage)
	: IJobContextExtractor<UsageContextSnapshot>
{
	public string Key => "usage"; // stable; renaming this class won't break in-flight records

	public UsageContextSnapshot? Capture() => usage.Value;

	public void Restore(UsageContextSnapshot snapshot) => usage.Value = snapshot;
}

builder.Services.AddScoped<UsageContext>();

[Handler, Job, UsesJobContext<UsageContextExtractor>]
public sealed partial class AuditUsageJob(UsageContext usage)
{
	// usage.Value contains the enqueueing scope's snapshot when this job runs.
}
```

`UsageContext` is the service injected from DI. The request pipeline populates it in the
enqueueing scope, and jobs or behaviors consume the restored value. `UsageContextSnapshot` is not
a DI service: it is the durable value returned by `Capture`, serialized with the job, and supplied
to `Restore` in the execution scope. Defining the snapshot with the extractor makes the extractor
reusable across jobs.

For a family of jobs, compose extractors on an application-owned marker attribute:

```csharp
[UsesJobContext<UsageContextExtractor>]
[UsesJobContext<CorrelationContextExtractor>]
public sealed class WebJobAttribute : Attribute;

[Handler, Job, WebJob]
public sealed partial class SendInvoiceJob
{
	// Captures and restores both contexts.
}
```

The generated scoped scheduler resolves extractors and captures them at enqueue time. The worker
creates a new scope, deserializes the envelope with generated metadata, then restores extractors in
attribute order before running behaviors. Extractor `Key` values must be stable and unique per job;
treat keys as persisted schema and keep context small and free of secrets.

An extractor must implement exactly one `IJobContextExtractor<TContext>`, and `TContext` follows
the same source-generated JSON restrictions as payloads. Multiple extractors are supported.

If a durable record contains an extractor key no longer known to the registered definition, the
runtime logs the orphaned slice and skips it so rolling deployments can continue. Restore failures
still fail the attempt. Plan a compatibility window when removing or renaming security-sensitive
extractors, because old jobs can then run without that slice.

Schedulers are scoped specifically so capture can safely use scoped services such as the current
request/tenant accessor. Payloadless recurring materialization has no request scope to capture and
therefore uses an empty context envelope.
