---
title: Introduction
description: Build, schedule and operate source-generated background jobs with Immediate.Handlers.
order: 1
---

<script lang="ts">
	import { Callout, CardGrid, LinkCard, PackageBadges } from '$lib/components/docs';
</script>

<PackageBadges name="Immediate.Jobs" nuget={false} release={false} />

Immediate.Jobs is a reflection-free background job scheduler built on
[Immediate.Handlers](/docs/Immediate.Handlers/introduction). A job is an ordinary handler marked
with `[Job]`; source generation adds a typed scheduler, JSON metadata, an execution adapter and DI
registration. The runtime supplies delayed and recurring work, queues, retries, workflows,
monitoring and durable storage providers.

<Callout type="warning" title="Preview documentation">

Immediate.Jobs has not published its first preview packages. These pages intentionally document
the checked-out `main` implementation and are the one exception to this site's latest-release
policy. The `--prerelease` commands below become usable when those packages are published. Preview
APIs and storage schemas can change before a stable release.

</Callout>

## Prerequisites and installation

Jobs target `net8.0`, `net9.0`, `net10.0` and `net11.0` and require Immediate.Handlers. Install the
main package in the project that declares the handlers:

```bash
dotnet add package Immediate.Jobs --prerelease
```

Choose a durable provider before production; in-memory storage is the automatic default when no
provider is selected.

## Your first job

```csharp title="SendWelcomeEmail.cs"
using Immediate.Handlers.Shared;
using Immediate.Jobs.Shared;

[Handler, Job(Name = "send-welcome-email", MaxAttempts = 5, Timeout = "00:02:00")]
public sealed partial class SendWelcomeEmail(IEmailSender sender)
{
	public sealed record Payload(Guid UserId, string Template);

	private ValueTask HandleAsync(Payload payload, CancellationToken cancellationToken) =>
		new(sender.SendAsync(payload.UserId, payload.Template, cancellationToken));
}

public sealed class SignupService(SendWelcomeEmail.Scheduler welcomeEmail)
{
	public ValueTask<JobHandle> EnqueueAsync(Guid userId, CancellationToken cancellationToken) =>
		welcomeEmail.EnqueueAsync(new(userId, "v2"), cancellationToken);
}
```

Register handlers and jobs, then inject the generated scoped scheduler:

```csharp title="Program.cs"
builder.Services.AddMyAppHandlers();
builder.Services.AddMyAppJobs(options => options.UseInMemory());
```

The injected type is `SendWelcomeEmail.Scheduler`. The returned `JobHandle` is an opaque
identifier for monitoring and continuations—not evidence that the job completed.

<Callout type="danger" title="Delivery is at least once">

A worker can finish a side effect and stop before recording success. The lease then expires and
another worker may run the same invocation. Make handlers idempotent: use the job ID or a domain
operation ID as a unique key, make updates conditional, and make external APIs idempotent where
possible. Immediate.Jobs does not include a transactional outbox.

</Callout>

## Where to go next

<CardGrid cols={2}>
	<LinkCard title="Create jobs" description="Declaration rules, payloads, names, retries and timeouts." href="/docs/Immediate.Jobs/creating-jobs" />
	<LinkCard title="Schedule work" description="Immediate, delayed, absolute and grouped scheduling." href="/docs/Immediate.Jobs/enqueueing-and-scheduling" />
	<LinkCard title="Recurring jobs" description="Cron schedules, time zones, reconciliation and manual triggers." href="/docs/Immediate.Jobs/recurring-jobs" />
	<LinkCard title="Build workflows" description="Atomic batches, chains, fan-out/fan-in and dynamic expansion." href="/docs/Immediate.Jobs/batches-and-continuations" />
	<LinkCard title="Choose storage" description="Durability, topology and provider capability tradeoffs." href="/docs/Immediate.Jobs/choosing-storage" />
	<LinkCard title="Operate jobs" description="Delivery guarantees, dashboard, telemetry and health checks." href="/docs/Immediate.Jobs/delivery-guarantees" />
	<LinkCard title="Test jobs" description="Fake time, deterministic draining, capture-only schedulers and assertions." href="/docs/Immediate.Jobs/testing-jobs" />
	<LinkCard title="API reference" description="Application-facing contracts, options and companion packages." href="/docs/Immediate.Jobs/api-reference" />
</CardGrid>
