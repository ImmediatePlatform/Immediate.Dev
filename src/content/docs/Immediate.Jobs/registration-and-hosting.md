---
title: Registration and hosting
description: Register handlers, behaviors, generated jobs, storage and the hosted worker correctly.
order: 9
group: Guides
---

Register the Immediate.Handlers pieces first, then the generated Jobs method. Handler registration
also adds each selected handler's behavior dependencies:

```csharp title="Program.cs"
builder.Services.AddMyAppHandlers();

builder.Services.AddMyAppJobs()
	.Configure(options =>
	{
		options.MaxParallelJobs = 16;
		options.PollingInterval = TimeSpan.FromSeconds(1);
	})
	.ConfigureStorage(storage => storage
		.UseEntityFrameworkCore<AppDbContext>()
		.UseSingleServer())
	.AddHealthCheck();
```

At source revision `ee5f51d`, `AddHealthCheck` needs the temporary options bridge shown in
[Observability and health](/docs/Immediate.Jobs/observability-and-health#health-checks).

`MyApp` is the shared [assembly identifier](/docs/concepts/assembly-identifier). `AddMyAppJobs`
accepts optional tags and returns `ImmediateJobsBuilder`. Chain runtime options, fair queues,
storage, and health checks from that builder.

The generated method lives in the project's `RootNamespace`, matching Immediate.Handlers. Import
that namespace (for example, `using MyApp;`) when startup code is outside it, including a top-level
`Program.cs`.

Registration adds the selected schedulers, invokers, context extractors, job definitions, all queue
definitions, and the generated `RecurringJobs` dispatcher. Calling a generated registration method
again does not add duplicate jobs or another hosted worker.

`AddMyAppJobs` does **not** register the generated Immediate.Handlers handlers; without
`AddMyAppHandlers`, enqueue succeeds but execution fails when the worker cannot resolve the handler
or its behaviors.

Generated job schedulers, `IBatchScheduler`, `IJobMonitor` and `IBatchMonitor` are scoped.
Definitions, queue definitions, invokers, `RecurringJobs`, storage, serializer, ID generator,
options and the worker service are singleton. Every execution creates its own scope for extractors,
behaviors, handler and dependencies.

## Fluent configuration

Use `Configure` with an action, configuration section, or section path for `ImmediateJobsOptions`.
Use `UseFairQueues` independently for `FairQueueOptions`, and call `ConfigureStorage` at most once:

```csharp
builder.Services.AddMyAppJobs()
	.Configure("ImmediateJobs")
	.UseFairQueues(builder.Configuration.GetSection("ImmediateJobs:FairQueues"))
	.ConfigureStorage(storage => storage
		.UseEntityFrameworkCore<AppDbContext>()
		.UseDistributed())
	.AddHealthCheck(tags: ["ready"]);
```

The options are validated when the host starts. If `ConfigureStorage` is omitted, Jobs uses
in-memory storage. A durable provider defaults to single-server mode when neither
`UseSingleServer` nor `UseDistributed` is selected. In production, choose one explicitly so it is
clear whether one or several scheduler processes may run.

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
