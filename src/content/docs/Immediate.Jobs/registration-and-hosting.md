---
title: Registration and hosting
description: Register handlers, behaviors, generated jobs, storage and the hosted worker correctly.
order: 9
group: Guides
---

Register the Immediate.Handlers pieces first, then the generated Jobs method:

```csharp title="Program.cs"
builder.Services.AddMyAppBehaviors();
builder.Services.AddMyAppHandlers();

builder.Services.AddMyAppJobs(options =>
{
	options.UseEntityFrameworkCore<AppDbContext>(); // single-server mode by default
	options.MaxParallelJobs = 16;
	options.PollingInterval = TimeSpan.FromSeconds(1);
}).AddHealthCheck();
```

`MyApp` is the shared [assembly identifier](/docs/concepts/assembly-identifier). `AddMyAppJobs`
registers each selected job's scheduler, invoker, context extractors and definition, all queue
definitions, then adds the runtime once. It does **not** register the generated Immediate.Handlers
handlers; without `AddMyAppHandlers`, enqueue succeeds but execution fails when the worker cannot
resolve the handler. Behaviors still require `AddMyAppBehaviors`.

Generated job schedulers, `IJobBatchScheduler`, `IJobMonitor` and `IJobBatchMonitor` are scoped.
Definitions, queue definitions, invokers, storage, serializer, ID generator, options and the worker
service are singleton. Every execution creates its own scope for extractors, behaviors, handler
and dependencies.

## Tagged registration

Jobs participate in the shared `[Handler(Tags = [...])]` model:

```csharp
builder.Services.AddMyAppHandlers(tags: ["fulfillment"]);
builder.Services.AddMyAppJobs(tags: ["fulfillment"]);
```

With no tags, all jobs are registered. With tags, an untagged job is always included and a tagged
job is included when any requested tag matches. Pass the same host slice to `AddMyAppHandlers` so
the selected job definitions have matching generated handlers. Queue definitions are
assembly-wide and are registered regardless of selected job tags.

## Hosted-service lifecycle

The worker starts with the host. It initializes storage, reconciles recurring definitions,
recovers eligible work, polls/acquires jobs, renews leases, emits heartbeats and periodically
purges history. At shutdown it stops acquisition, cancels active work and waits up to
`ShutdownTimeout` (30 seconds by default).

Provider/schema initialization happens during worker startup. Your application still owns its
database schema or bootstrap as described in
[Configuring storage providers](/docs/Immediate.Jobs/configuring-storage-providers). Start the
entire `IHost` in console and worker-service applications; merely building the service provider
does not run jobs.
