---
title: API reference
description: Public APIs for defining, scheduling, monitoring, managing, storing and testing jobs.
order: 16
group: Reference
---

This page lists the public APIs most applications use. Generated scheduler methods appear on their
public base contracts, although application code normally calls `YourJob.Scheduler`.

## Namespaces

| Namespace                          | Contains                                                          |
| ---------------------------------- | ----------------------------------------------------------------- |
| `Immediate.Jobs.Shared`            | Job declarations, handles, schedulers, batches and configuration. |
| `Immediate.Jobs.Shared.Interfaces` | Scheduling, recurring jobs, monitoring, serialization and IDs.    |
| `Immediate.Jobs.Shared.Apis`       | `JobMonitor` and the records returned by monitoring calls.        |
| `Immediate.Jobs.Shared.Storage`    | Contracts for custom storage providers.                           |

Storage-provider extensions use `Immediate.Jobs.EntityFrameworkCore`, `Immediate.Jobs.LinqToDB`,
and `Immediate.Jobs.Redis`. The generated `AddXxxJobs` and `RecurringJobs` types are placed in the
application project's `RootNamespace`.

## Declaration attributes and enums

```csharp
sealed class JobAttribute : Attribute
{
	string? Name { get; init; }
	string? Cron { get; init; }
	string? TimeZone { get; init; }
	int MaxAttempts { get; init; }                 // 3
	string? Timeout { get; init; }
	int MaxConcurrency { get; init; }              // 0 = unbounded
	OverlapPolicy OverlapPolicy { get; init; }     // Skip
	BackoffStrategy Backoff { get; init; }         // ExponentialJitter
	string BackoffBase { get; init; }              // "00:00:05"
}

enum OverlapPolicy { Skip, Queue, Concurrent }
enum BackoffStrategy { Fixed, Exponential, ExponentialJitter }
enum JobState
{
	AwaitingContinuation, AwaitingParameters, Scheduled, Pending, Active,
	Succeeded, Failed, Cancelled, Skipped
}
enum JobExecutionState { Active, Succeeded, Failed, Cancelled, Interrupted }

sealed class QueueDefinitionAttribute : Attribute
{
	string? Name { get; init; }
	int Priority { get; init; }
	int Concurrency { get; init; }
}

sealed class UsesQueueAttribute<TQueue> : Attribute;
sealed class UsesJobContextAttribute<TExtractor> : Attribute
	where TExtractor : JobContextExtractor;
```

## Requests, handles and context

```csharp
interface IJobRequest { JobDetails? JobDetails { get; set; } }
record struct EmptyJobRequest : IJobRequest;

sealed record JobDetails
{
	JobHandle JobHandle { get; }
	string JobName { get; }
	string QueueName { get; }
	int Attempt { get; }
	DateTimeOffset CreatedAt { get; }
	DateTimeOffset ScheduledAt { get; }
	BatchHandle? BatchHandle { get; }
}

closed record ContinuationHandle;

sealed record JobHandle : ContinuationHandle
{
	required string Value { get; init; }
	static JobHandle? FromString(string? value);
}

sealed record BatchHandle : ContinuationHandle
{
	required string Value { get; init; }
	static BatchHandle? FromString(string? value);
}

sealed class BatchJobHandle
{
	Batch Batch { get; }
	JobHandle JobHandle { get; }
}

public abstract class JobContextExtractor<TContext>
{
	public abstract string Key { get; }
	public abstract TContext? Capture();
	public abstract void Restore(TContext context);
}
```

`JobHandle` and `BatchHandle` serialize as their string identifier. `BatchJobHandle` belongs to an
open batch and cannot cross that boundary. Its `JobHandle` throws until the batch commits.

`IIdGenerator.CreateId(IdKind kind)` creates `Job` and `Batch` IDs. The default returns a GUID in
the `N` format. `IImmediateJobsBuilder.UseIdGenerator<TGenerator>()` replaces it with a singleton,
thread-safe generator; see [Custom identifiers](/docs/Immediate.Jobs/enqueueing-and-scheduling#custom-identifiers)
for a Snowflake example.

## Typed scheduling

```csharp
interface IJobScheduler<TPayload>
{
	ValueTask<JobHandle> EnqueueAsync(TPayload payload, CancellationToken token = default);
	ValueTask<JobHandle> EnqueueAsync(
		TPayload payload, string groupId, CancellationToken token = default);

	ValueTask<JobHandle> ScheduleAsync(TPayload payload, TimeSpan delay, CancellationToken token = default);
	ValueTask<JobHandle> ScheduleAsync(TPayload payload, DateTimeOffset at, CancellationToken token = default);
	// TimeSpan and DateTimeOffset forms also have groupId overloads.

	ValueTask<JobHandle> EnqueueAsync(
		TPayload payload, JobDetails currentJob,
		ContinuationOptions options = ContinuationOptions.BeforeContinuations,
		CancellationToken token = default);
	ValueTask<JobHandle> ScheduleAsync(
		TPayload payload, JobDetails currentJob, TimeSpan delay,
		ContinuationOptions options = ContinuationOptions.BeforeContinuations,
		CancellationToken token = default);
	ValueTask<JobHandle> ScheduleAsync(
		TPayload payload, JobDetails currentJob, DateTimeOffset at,
		ContinuationOptions options = ContinuationOptions.BeforeContinuations,
		CancellationToken token = default);
	// Current-job forms also have groupId overloads.

	ValueTask<JobHandle> ScheduleAfterAsync(
		TPayload payload, ContinuationHandle parent,
		ContinuationTrigger on = ContinuationTrigger.Success,
		CancellationToken token = default);
	ValueTask<JobHandle> ScheduleAfterAsync(
		TPayload payload, IReadOnlyList<ContinuationHandle> parents,
		ContinuationTrigger on = ContinuationTrigger.Success,
		CancellationToken token = default);
	// Durable continuation forms also accept a TimeSpan delay and a groupId.

	JobHandle ScheduleAfter(
		TPayload payload, JobDetails currentJob,
		ContinuationOptions options = ContinuationOptions.BeforeContinuations);
	JobHandle ScheduleAfter(
		TPayload payload, JobDetails currentJob, TimeSpan delay,
		ContinuationOptions options = ContinuationOptions.BeforeContinuations);
	// Buffered current-job forms also have groupId overloads.

	BatchJobHandle Enqueue(TPayload payload, Batch batch);
	BatchJobHandle Schedule(TPayload payload, Batch batch, TimeSpan delay);
	BatchJobHandle Schedule(TPayload payload, Batch batch, DateTimeOffset at);
	BatchJobHandle ScheduleAfter(
		TPayload payload, BatchJobHandle parent,
		ContinuationTrigger on = ContinuationTrigger.Success);
	BatchJobHandle ScheduleAfter(
		TPayload payload, IReadOnlyList<BatchJobHandle> parents,
		ContinuationTrigger on = ContinuationTrigger.Success);
	// Open-batch forms also accept a delay and a groupId.

	ValueTask CancelAsync(JobHandle job, CancellationToken token = default);
}
```

`EnqueueAsync` and `ScheduleAsync` with `JobDetails` immediately add work to the current job's
batch. `ScheduleAfter` buffers the new job until the current attempt succeeds. `Enqueue`,
`Schedule` and the `BatchJobHandle` forms of `ScheduleAfter` only update an open batch in memory.
The async `ScheduleAfterAsync` forms persist a continuation whose parents are already durable.
A continuation delay begins after every parent reaches the required outcome.

`ContinuationTrigger.Success` waits for every parent to succeed. `Failure` waits for every parent
to become terminal and then runs when at least one failed. `Complete` waits for every parent to
become terminal regardless of outcome. A `BatchHandle` is a single parent whose state becomes
`Failed` when any item in the completed batch failed; cancellation or skipped branches alone do
not satisfy `Failure`. When a `Success` or `Failure` condition cannot be satisfied, the child and
any ineligible descendants become terminal `Skipped` records.

| `ContinuationOptions`           | Batch membership | Effect on the current job's existing continuations               |
| ------------------------------- | ---------------- | ---------------------------------------------------------------- |
| `Detached`                      | None             | Unchanged; valid only with `ScheduleAfter`.                      |
| `BesideContinuations`           | Current batch    | Unchanged; the new job forms a parallel branch.                  |
| `BeforeContinuations` (default) | Current batch    | They also wait for the new job, creating an additive dependency. |

## Recurring and batches

```csharp
interface IRecurringJobTrigger
{
	ValueTask<JobHandle> TriggerNowAsync(CancellationToken token = default);
}

interface IRecurringJobScheduler : IRecurringJobTrigger
{
	ValueTask AddOrUpdateRecurringAsync(
		string name, string cron, string timeZone = "UTC",
		CancellationToken token = default);
	ValueTask RemoveRecurringAsync(string name, CancellationToken token = default);
}

// Generated in the application's root namespace for all payloadless jobs.
sealed class RecurringJobs
{
	ValueTask TriggerNowAsync(string jobName, CancellationToken token = default);
}

sealed class Batch : IAsyncDisposable
{
	bool IsCommitted { get; }
	BatchHandle BatchHandle { get; }
	ValueTask<BatchHandle> CommitAsync(CancellationToken token = default);
}

interface IBatchScheduler
{
	ValueTask CancelAsync(BatchHandle handle, CancellationToken token = default);
	Batch Begin();
	Batch Begin(BatchHandle after, ContinuationTrigger on = ContinuationTrigger.Success);
	Batch Begin(
		IReadOnlyList<BatchHandle> after,
		ContinuationTrigger on = ContinuationTrigger.Success);
	ValueTask<BatchHandle> RunAsync(
		Func<Batch, ValueTask> body, CancellationToken token = default);
}
```

Each `RecurringJobSchedule` stores the generated job's `QueueName`. `BatchState` is `Executing`,
`Succeeded`, `Failed`, or `Cancelled`.

## Runtime configuration

`AddXxxJobs(params ... tags)` returns `IImmediateJobsBuilder`. The interface exposes:

```csharp
IServiceCollection Services { get; }

IImmediateJobsBuilder ConfigureWorkers(Action<ImmediateJobsOptions> configure);
IImmediateJobsBuilder ConfigureWorkers(
	Action<OptionsBuilder<ImmediateJobsOptions>> configure);
IImmediateJobsBuilder DisableWorkers();

IImmediateJobsBuilder UseFairQueues();
IImmediateJobsBuilder UseFairQueues(
	Action<OptionsBuilder<FairQueueOptions>> configure);

IImmediateJobsBuilder ConfigureStorage(
	Action<IImmediateJobsStorageBuilder> configure);
IImmediateJobsBuilder UseIdGenerator<TGenerator>();
IImmediateJobsBuilder AddHealthCheck(
	string name = "immediate-jobs",
	HealthStatus? failureStatus = null,
	IEnumerable<string>? tags = null);
```

| `ImmediateJobsOptions` member                    |                                             Default |
| ------------------------------------------------ | --------------------------------------------------: |
| `IsJobSchedulingServiceEnabled`                  |                                              `true` |
| `MaxParallelJobs`                                | `Math.Clamp(Environment.ProcessorCount * 4, 8, 32)` |
| `AcquisitionBatchSize`                           |                                                `32` |
| `PollingInterval`                                |                                            1 second |
| `LeaseDuration`                                  |                                          30 seconds |
| `ShutdownTimeout`                                |                                          30 seconds |
| `SucceededRetention` / `BatchSucceededRetention` |                                            24 hours |
| `FailedRetention` / `BatchFailedRetention`       |                                              7 days |
| `PurgeInterval`                                  |                                              1 hour |

`IImmediateJobsStorageBuilder` exposes `Services`, `UseInMemory()`, `UseStorage(factory)`,
`UseStorage<TJobStorage>()`, `UseSingleServer()`, `UseSingleServer(factory)`, `UseDistributed()`,
and `UseDistributed(factory)`. Call `ConfigureStorage` exactly once and select a provider. A
durable provider uses single-server mode unless you select a mode explicitly. Redis always uses
distributed mode. Provider extensions can use `Services` to add their dependencies.

`DisableWorkers()` sets `IsJobSchedulingServiceEnabled` to `false`. The hosted worker exits without
initializing storage or executing jobs. Registration, schedulers and storage remain available.

`FairQueueOptions` defaults to `Enabled = false`, `ConcurrencyShareThreshold = 0.10`,
`MinInflightForNoisy = 30`, and `GroupRoundRobin = true`. `UseFairQueues` sets `Enabled` to `true`.
The `OptionsBuilder<T>` overloads support configuration binding. Jobs validates
`ImmediateJobsOptions` and `FairQueueOptions` at startup.

## Serialization and telemetry

`IJobSerializer` exposes generic `Serialize` and `Deserialize` overloads with or without generated
`JsonTypeInfo<T>`. `SystemTextJsonJobSerializer` uses web defaults and exposes `Options`. Generated
jobs use the overloads with generated JSON metadata. The activity source and meter are both named
`Immediate.Jobs`.

## Monitoring and management

`JobMonitor` is the scoped service for reading status and managing stored jobs, batches and
recurring schedules. `IJobMonitor` contains only the read methods and resolves to the same scoped
instance. Use the interface when a component does not need management commands or when a test
needs a simple replacement.

```csharp
interface IJobMonitor
{
	ValueTask<JobMonitoringSnapshot> GetSnapshotAsync(CancellationToken token = default);
	ValueTask<IReadOnlyList<JobRecord>> QueryJobsAsync(
		JobQuery query, CancellationToken token = default);
	ValueTask<IReadOnlyList<JobExecutionRecord>> QueryExecutionsAsync(
		JobHandle jobHandle, JobExecutionQuery query, CancellationToken token = default);
	ValueTask<JobStatus?> GetJobAsync(JobHandle jobHandle, CancellationToken token = default);
	ValueTask<IReadOnlyList<BatchStatus>?> QueryBatchesAsync(
		BatchQuery query, CancellationToken token = default);
	ValueTask<BatchStatus?> GetBatchAsync(BatchHandle batchHandle, CancellationToken token = default);
	ValueTask<IReadOnlyList<BatchMemberStatus>?> QueryBatchMembersAsync(
		BatchHandle batchHandle, BatchMemberQuery query, CancellationToken token = default);
	ValueTask<BatchGraph?> GetBatchGraphAsync(
		BatchHandle batchHandle, CancellationToken token = default);
}

sealed record BatchStatus(
	BatchHandle BatchHandle, BatchState State,
	int Total, int Succeeded, int Failed, int Cancelled, int Skipped, int Remaining,
	DateTimeOffset CreatedAt, DateTimeOffset? StartedAt, DateTimeOffset? CompletedAt,
	double FractionSettled
);

sealed record JobExecutionRecord
{
	static JobExecutionRecord? CreateSynthetic(JobRecord job);
	JobHandle JobHandle { get; init; }
	int Attempt { get; init; }
	JobExecutionState State { get; init; }
	string? WorkerId { get; init; }
	DateTimeOffset? AcquiredAt { get; init; }
	DateTimeOffset? ExecutionStartedAt { get; init; }
	DateTimeOffset? CompletedAt { get; init; }
	string? ExecutionTraceId { get; init; }
	string? ExecutionSpanId { get; init; }
	string? Error { get; init; }
	bool IsSynthetic { get; init; }
}
```

The concrete `JobMonitor` also exposes these management methods:

```csharp
ValueTask CancelJobAsync(JobHandle jobHandle, CancellationToken token = default);
ValueTask RetryJobAsync(JobHandle jobHandle, CancellationToken token = default);
ValueTask CancelBatchAsync(BatchHandle batchHandle, CancellationToken token = default);
ValueTask DeleteBatchAsync(BatchHandle batchHandle, CancellationToken token = default);
ValueTask PauseRecurringAsync(string name, CancellationToken token = default);
ValueTask ResumeRecurringAsync(string name, CancellationToken token = default);
ValueTask TriggerRecurringAsync(string name, CancellationToken token = default);
```

Query objects enforce these rules:

- `JobQuery` can filter by `JobHandle`, state, queue name, job name or search text for job names.
- `JobExecutionQuery` contains paging and an optional positive attempt number. Pass its `JobHandle`
  separately to `QueryExecutionsAsync`.
- `BatchQuery` and `BatchMemberQuery` can filter by state.
- IDs and text filters cannot be blank.
- `Skip` must be zero or greater. `Take` must be from 1 through 1,000 and defaults to 100.

`JobStatus`, `BatchStatus`, `BatchMemberStatus`, `BatchGraph`, `BatchGraphNode` and
`BatchGraphEdge` are read-only monitoring records. `FractionSettled` counts every finished result,
including `Skipped`. `BatchGraphEdge.Delay` records how long the child waits after its parent
condition is met. `QueryExecutionsAsync` returns saved attempts newest first unless
`JobExecutionQuery.Attempt` selects one. `IsSynthetic` is `true` when Jobs rebuilt execution data
from the owning `JobRecord` because no separate execution record was available.

`GetSnapshotAsync` reports the features supported by the current storage provider. `GetJobAsync`
includes the current job definition's `MaxAttempts`; the value is zero when that definition is not
registered in the current process. Batch reads return `null` when storage does not support graphs.
`GetBatchAsync` and `GetBatchGraphAsync` also return `null` when the batch does not exist.

`CancelJobAsync` cancels a job that has not finished. `RetryJobAsync` retries a failed job or runs
a scheduled job now. Batch commands require graph storage. Recurring commands require recurring
storage and use the saved schedule name. Blank IDs and names are rejected.

## Dashboard

```csharp
IImmediateJobsDashboardBuilder AddImmediateJobsDashboard(
	this IImmediateJobsBuilder builder);
IImmediateJobsDashboardBuilder ConfigureDashboard(
	Action<ImmediateJobsDashboardOptions> configure);
IImmediateJobsDashboardBuilder ConfigureDashboard(
	Action<OptionsBuilder<ImmediateJobsDashboardOptions>> configure);
IImmediateJobsDashboardBuilder AddTelemetryLink(
	string label,
	JobTelemetryLinkKind kind,
	Func<JobTelemetryLinkContext, Uri?> createUrl);

RouteGroupBuilder MapImmediateJobsDashboard(
	this IEndpointRouteBuilder endpoints);
RouteGroupBuilder MapImmediateJobsDashboard(
	this IEndpointRouteBuilder endpoints, string prefix);
```

Chain `AddImmediateJobsDashboard` from the jobs registration before building the application.
`ConfigureDashboard` sets options. `MapImmediateJobsDashboard` only selects the default or custom
path. Jobs validates the settings when the host starts.

`ImmediateJobsDashboardOptions.UpdateInterval` defaults to two seconds.
`RestrictToDevelopmentEnvironment` defaults to `true`, and `AuthorizationPolicy` defaults to
`null`. A named policy replaces the environment check. With no policy, setting the restriction to
`false` makes the dashboard available in every environment. Link kinds are `Trace` and `Logs`.
`JobTelemetryLinkContext.Execution` is `null` for a job-level link and contains the exact
`JobExecutionRecord` for an execution-level link.

## Provider registration

```csharp
IImmediateJobsStorageBuilder UseEntityFrameworkCore<TContext>();
ModelBuilder AddImmediateJobs(string? schema = null);

IImmediateJobsStorageBuilder UseLinqToDB<TContext>(string? schema = null);
Task CreateImmediateJobsSchemaAsync<TContext>(
	this TContext context, string? schema = null,
	CancellationToken cancellationToken = default);

IImmediateJobsRedisBuilder UseRedis();
IImmediateJobsRedisBuilder ConfigureRedis(
	Action<RedisJobStorageOptions> configure);
IImmediateJobsRedisBuilder ConfigureRedis(
	Action<OptionsBuilder<RedisJobStorageOptions>> configure);
```

`UseLinqToDB<TContext>` requires a registered `DataConnection` type. The schema helper extends that
connection type. `UseRedis` requires a registered `IConnectionMultiplexer` and selects distributed
mode. `RedisJobStorageOptions` exposes `Database = -1` and `KeyPrefix = "immediate-jobs"`.

## NodaTime

Extension overloads add `Duration` and `Instant` to ordinary and current-job `ScheduleAsync` calls.
They also cover delayed durable continuations, buffered current-job continuations, open-batch
scheduling and open-batch continuations. Each grouped core form has a grouped NodaTime form.
Recurring scheduling adds `AddOrUpdateRecurringAsync(..., DateTimeZone, ...)`. Serialization APIs are
`JsonSerializerOptions.UseNodaTime(...)`, `IServiceCollection.AddImmediateJobsNodaTime(...)` and
the three `NodaTimeJobSerializer` constructors. See the [NodaTime guide](/docs/Immediate.Jobs/nodatime)
for registration and examples.

## Testing

`JobTestHarness` constructors accept optional service configuration and optional fake-time start;
it exposes `Services`, `Storage`, `Captures`, `TimeProvider`, `Batches`, and `Scheduler`. Operations
are `DrainAsync`, both `AdvanceTimeAndDrainAsync` overloads, `QueryJobsAsync`, both `GetJobAsync`
overloads, both `AssertEnqueuedAsync<T>` overloads, `AssertBatchCommittedAtomicallyAsync`,
`AssertContinuationReleasedAfterAsync`, `AssertCascadeSkippedAsync`,
`AssertCascadeCancelledAsync`, and `RunThroughPipelineAsync<T>`.

`CapturingJobStorage` wraps the harness's in-memory graph storage. `Jobs`, `Continuations`,
`Batches`, `BatchJobs`, `DynamicContinuations`, `RecurringSchedules`, `RecurringOperations` and
`RecurringMaterializations` return capture snapshots. `FindJob(JobHandle)` and
`FindBatch(BatchHandle)` locate one item. `Clear()` clears captures without deleting durable state.

`JobStorageConformanceSuite.GetCases(StorageCapabilities)` returns an independent
`JobStorageConformanceTestCase` for each selected storage behavior. The suite works with any test
framework. Each case exposes `Name`, `RequiredCapabilities`, and
`RunAsync(IServiceProvider, CancellationToken)`. It checks the storage registration and reported
features before running. Tests that depend on time require a `FakeTimeProvider` registered as
`TimeProvider`. `JobStorageConformanceSuite.AllCasesByName` is a case-insensitive map of every known
case by name.

## Custom storage contracts

| Interface                 | Purpose                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `IJobStorage`             | Store, claim, renew, finish, retry, cancel, delete and query jobs; report worker health.           |
| `IRecurringJobStorage`    | Store schedules, find due runs, create each run once and remove obsolete code-defined schedules.   |
| `IJobGraphStorage`        | Store and update batches and continuations; add jobs while a batch runs; query and manage batches. |
| `IFairQueueStorage`       | Share available work fairly across groups.                                                         |
| `IJobStorageReplica`      | Claim the exact job IDs selected by the single-server in-memory queue.                             |
| `IJobGraphStorageReplica` | Load incoming continuation links when a single-server worker starts.                               |

`StorageCapabilities` flags are `Queue`, `Recurring`, `Graph`, `FairQueues`, and `Replica`. Call
`storage.GetCapabilities()` to report these features. `Replica` represents only
`IJobStorageReplica`. Single-server storage also requires `IJobGraphStorageReplica`,
`IRecurringJobStorage`, and `IJobGraphStorage`.

`JobRecord` and the other storage record types are for provider authors, not ordinary scheduling
or monitoring code. Their job and batch identifiers use `JobHandle` and `BatchHandle`. Storage
implementations convert the nested string values only at backend boundaries.

`IJobStorage.RetryAsync` accepts `Failed` and `Scheduled`. A scheduled job moves to `Pending`
immediately without changing its attempt count or latest failure details.

`IJobStorage.CancelAsync` accepts jobs that have not finished. `DeleteAsync` accepts only final
states. Storage must reject updates from an older attempt after its lease expires or it is
cancelled. Worker updates match the job ID, execution number and worker ID. Graph changes match the
job ID and execution number.

Custom providers must implement
`QueryJobExecutionsAsync(JobHandle, JobExecutionQuery, ...)` and keep execution records until the
owning job or batch is deleted or purged. `JobContinuationEdge` and `JobContinuationAddition`
include a required `Delay`; apply it when the parent condition is satisfied.
