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
	.ConfigureWorkers(options =>
	{
		options.WorkerCount = 16;
		options.PollingInterval = TimeSpan.FromSeconds(1);
	})
	.ConfigureStorage(storage => storage
		.UseEntityFrameworkCore<AppDbContext>()
		.UseSingleServer())
	.AddHealthCheck();
```

`MyApp` is the shared [assembly identifier](/docs/concepts/assembly-identifier). `AddMyAppJobs`
accepts optional tags and returns `IImmediateJobsBuilder`. Use that builder to configure worker
settings, fair queues, storage and health checks.

The generated method lives in the project's `RootNamespace`, matching Immediate.Handlers. Import
that namespace (for example, `using MyApp;`) when startup code is outside it, including a top-level
`Program.cs`.

Registration adds the selected jobs. Each generated job definition carries its queue definition,
so the worker only polls queues used by registered jobs. Calling the method again does not
duplicate jobs or add another worker.

`AddMyAppJobs` does **not** register the generated Immediate.Handlers handlers; without
`AddMyAppHandlers`, enqueue succeeds but execution fails when the worker cannot resolve the handler
or its behaviors.

The main service lifetimes are:

| Lifetime  | Services                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Scoped    | Generated job schedulers and context extractors.                                                                                               |
| Singleton | Job definitions, generated invokers, `IBatchScheduler`, `JobMonitor` and `IJobMonitor`, storage, serializer, ID generator, options and worker. |

Each job run gets a new scope for its context extractors, behaviors, handler and dependencies.

## Fluent configuration

`ConfigureWorkers` accepts either a direct options action or an
`OptionsBuilder<ImmediateJobsOptions>` action. The second form can bind an `IConfiguration`
section. `UseFairQueues` has the same binding option. Pass a section to `Bind`, or call
`BindConfiguration` with its path to use the configuration registered with dependency injection.
Call `ConfigureStorage` exactly once:

```csharp
builder.Services.AddMyAppJobs()
	.ConfigureWorkers(options => options.Bind(
		builder.Configuration.GetSection("ImmediateJobs")))
	.UseFairQueues(options => options.Bind(
		builder.Configuration.GetSection("ImmediateJobs:FairQueues")))
	.ConfigureStorage(storage => storage
		.UseEntityFrameworkCore<AppDbContext>()
		.UseDistributed())
	.AddHealthCheck(tags: ["ready"]);
```

Jobs validates these options when the host starts. Use `UseInMemory()` for in-memory storage. A
durable provider defaults to single-server mode when neither `UseSingleServer` nor
`UseDistributed` is selected. In production, choose a mode explicitly so the registration shows
whether one or several scheduler processes may run.

## Tagged registration

Jobs participate in the shared `[Handler(Tags = [...])]` model:

```csharp
builder.Services.AddMyAppHandlers(tags: ["fulfillment"]);
builder.Services.AddMyAppJobs(tags: ["fulfillment"])
	.ConfigureStorage(storage => storage.UseInMemory());
```

With no tags, all jobs are registered. With tags, an untagged job is always included and a tagged
job is included when any requested tag matches. Pass the same tags to `AddMyAppHandlers` so every
selected job has its generated handler. Only the queues used by the selected jobs are polled.

## Worker startup and shutdown

The worker starts with the host. It prepares storage, merges code-defined recurring schedules and
then runs independent loops:

- the acquisition loop creates due recurring runs, claims due jobs every `PollingInterval` and
  removes old history;
- `WorkerCount` workers execute the claimed jobs;
- the lease-renewal loop renews each running job's lease every third of `LeaseDuration`;
- the heartbeat loop reports the node to storage every third of `ServerTimeout`.

A failed iteration of one loop is logged and does not stop the others. At shutdown, the worker
stops taking new work, lets claimed jobs drain and waits up to `ShutdownTimeout` (30 seconds by
default) before cancelling jobs that are still running.

`WorkerCount` sets how many jobs run at once on the node. `MaxAcquisitionCount` limits how many jobs
the node holds at once, counting both running jobs and claimed jobs waiting for a free worker. Set
it above `WorkerCount` when a longer `PollingInterval` should still keep workers busy between polls.
When it is lower than `WorkerCount`, it becomes the effective limit on parallel jobs. Claimed jobs
keep their leases while they wait.

The storage provider starts with the worker, but the application still creates and updates its
database schema as described in
[Configuring storage providers](/docs/Immediate.Jobs/configuring-storage-providers). Start the
entire `IHost` in console and worker-service applications; merely building the service provider
does not run jobs.

Call `DisableWorkers()` when an application should enqueue or display jobs but a separate process
will execute them. Job registration and storage remain available. The hosted service still
prepares storage and merges code-defined recurring schedules, then exits without starting any
loops or jobs. The application must still call `ConfigureStorage`.
