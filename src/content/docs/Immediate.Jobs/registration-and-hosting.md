---
title: Registration and hosting
description: Register handlers, jobs, storage and the worker service.
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

`MyApp` is the shared [assembly identifier](/docs/concepts/assembly-identifier). `AddMyAppJobs`
accepts optional tags and returns `ImmediateJobsBuilder`. Use that builder to configure runtime
settings, fair queues, storage and health checks.

The generated method lives in the project's `RootNamespace`, matching Immediate.Handlers. Import
that namespace (for example, `using MyApp;`) when startup code is outside it, including a top-level
`Program.cs`.

Registration adds the selected jobs, every queue definition and the generated `RecurringJobs`
service. Calling the method again does not duplicate jobs or add another worker.

`AddMyAppJobs` does **not** register the generated Immediate.Handlers handlers; without
`AddMyAppHandlers`, enqueue succeeds but execution fails when the worker cannot resolve the handler
or its behaviors.

The main service lifetimes are:

| Lifetime  | Services                                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| Scoped    | Generated job schedulers, `IBatchScheduler`, `JobMonitor` and its read-only `IJobMonitor` interface.                   |
| Singleton | Job and queue definitions, generated invokers, `RecurringJobs`, storage, serializer, ID generator, options and worker. |

Each job run gets a new scope for its context extractors, behaviors, handler and dependencies.

## Fluent configuration

`Configure` accepts an action, a configuration section or a section path for
`ImmediateJobsOptions`. `UseFairQueues` configures fair-queue settings separately. Call
`ConfigureStorage` at most once:

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
job is included when any requested tag matches. Pass the same tags to `AddMyAppHandlers` so every
selected job has its generated handler. Queue definitions are registered for the whole assembly,
regardless of the selected job tags.

## Worker startup and shutdown

The worker starts with the host. It prepares storage, restores saved work, starts jobs when they
are due, renews their leases, reports its health and removes old history. At shutdown, it stops
taking new work, cancels active jobs and waits up to `ShutdownTimeout` (30 seconds by default).

The storage provider starts with the worker, but the application still creates and updates its
database schema as described in
[Configuring storage providers](/docs/Immediate.Jobs/configuring-storage-providers). Start the
entire `IHost` in console and worker-service applications; merely building the service provider
does not run jobs.
