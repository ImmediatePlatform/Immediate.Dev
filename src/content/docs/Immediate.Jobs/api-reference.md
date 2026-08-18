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

sealed record JobDetails(
	string JobId, string JobName, string QueueName, int Attempt,
	DateTimeOffset CreatedAt, DateTimeOffset ScheduledAt, string? BatchId = null
);

readonly struct JobHandle
{
	JobHandle(string id);
	string Id { get; }
}

sealed record BatchHandle
{
	BatchHandle(string id);
	string Id { get; }
}

public abstract class JobContextExtractor<TContext>
{
	public abstract string Key { get; }
	public abstract TContext? Capture();
	public abstract void Restore(TContext context);
}
```

`IIdGenerator.CreateId(IdKind kind)` creates `Job` and `Batch` IDs. The default returns a GUID in
the `N` format. `ImmediateJobsBuilder.UseIdGenerator<TGenerator>()` replaces it with a singleton,
thread-safe generator; see [Custom identifiers](/docs/Immediate.Jobs/enqueueing-and-scheduling#custom-identifiers)
for a Snowflake example.

## Typed scheduling

```csharp
interface IJobScheduler<TPayload>
{
	ValueTask CancelAsync(JobHandle handle, CancellationToken token = default);
	ValueTask<JobHandle> EnqueueAsync(TPayload payload, CancellationToken token = default);
	ValueTask<JobHandle> EnqueueAsync(TPayload payload, string? groupId, CancellationToken token);
	ValueTask<JobHandle> ScheduleAsync(TPayload payload, TimeSpan delay, CancellationToken token = default);
	ValueTask<JobHandle> ScheduleAsync(TPayload payload, TimeSpan delay, string? groupId, CancellationToken token);
	ValueTask<JobHandle> ScheduleAtAsync(TPayload payload, DateTimeOffset runAt, CancellationToken token = default);
	ValueTask<JobHandle> ScheduleAtAsync(TPayload payload, DateTimeOffset runAt, string? groupId, CancellationToken token);
}
```

Every generated `JobScheduler<TPayload>` additionally exposes:

```csharp
JobHandle AddToBatch(Batch batch, TPayload payload, TimeSpan? delay = null);
JobHandle AddToBatchInGroup(
	Batch batch, TPayload payload, string? groupId, TimeSpan? delay = null);
JobHandle AddToBatchAt(Batch batch, TPayload payload, DateTimeOffset runAt);
JobHandle AddToBatchAt(
	Batch batch, TPayload payload, DateTimeOffset runAt, string? groupId);

ValueTask<JobHandle> ScheduleAfterAsync(
	JobHandle parent, TPayload payload,
	ContinuationTrigger on = ContinuationTrigger.Success,
	TimeSpan? delay = null, CancellationToken token = default);
ValueTask<JobHandle> ScheduleAfterAsync(
	ReadOnlySpan<JobHandle> parents, TPayload payload,
	ContinuationTrigger on = ContinuationTrigger.Success,
	TimeSpan? delay = null, CancellationToken token = default);
ValueTask<JobHandle> ScheduleAfterAsync(
	BatchHandle parent, TPayload payload,
	ContinuationTrigger on = ContinuationTrigger.Success,
	TimeSpan? delay = null, CancellationToken token = default);

JobHandle ScheduleAfter(
	JobDetails current, TPayload payload,
	ContinuationOptions options = ContinuationOptions.BeforeContinuations);
ValueTask<JobHandle> AddToBatchAsync(
	JobDetails current, TPayload payload,
	ContinuationOptions options = ContinuationOptions.BeforeContinuations,
	CancellationToken token = default);
```

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

public sealed class Batch : IAsyncDisposable
{
	public string Id { get; }
	public ValueTask<BatchHandle> CommitAsync(CancellationToken token = default);
}

interface IBatchScheduler
{
	ValueTask CancelAsync(BatchHandle handle, CancellationToken token = default);
	Batch Begin();
	Batch Begin(BatchHandle after, ContinuationTrigger on = ContinuationTrigger.Success);
	ValueTask<BatchHandle> RunAsync(
		Func<Batch, ValueTask> body, CancellationToken token = default);
}
```

`BatchState` is `Executing`, `Succeeded`, `Failed`, or `Cancelled`.

## Runtime configuration

`AddXxxJobs(params ... tags)` returns `ImmediateJobsBuilder`. The builder exposes:

```csharp
ImmediateJobsBuilder Configure(string configurationSectionPath);
ImmediateJobsBuilder Configure(IConfiguration configurationSection);
ImmediateJobsBuilder Configure(Action<ImmediateJobsOptions> configure);

ImmediateJobsBuilder UseFairQueues();
ImmediateJobsBuilder UseFairQueues(string configurationSectionPath);
ImmediateJobsBuilder UseFairQueues(IConfiguration configurationSection);
ImmediateJobsBuilder UseFairQueues(Action<FairQueueOptions> configure);

ImmediateJobsBuilder ConfigureStorage(Action<ImmediateJobsStorageBuilder> configure);
ImmediateJobsBuilder UseIdGenerator<TGenerator>();
ImmediateJobsBuilder AddHealthCheck(
	string name = "immediate-jobs",
	HealthStatus? failureStatus = null,
	IEnumerable<string>? tags = null);
```

| `ImmediateJobsOptions` member                    |                                             Default |
| ------------------------------------------------ | --------------------------------------------------: |
| `MaxParallelJobs`                                | `Math.Clamp(Environment.ProcessorCount * 4, 8, 32)` |
| `AcquisitionBatchSize`                           |                                                `32` |
| `PollingInterval`                                |                                            1 second |
| `LeaseDuration`                                  |                                          30 seconds |
| `ShutdownTimeout`                                |                                          30 seconds |
| `SucceededRetention` / `BatchSucceededRetention` |                                            24 hours |
| `FailedRetention` / `BatchFailedRetention`       |                                              7 days |
| `PurgeInterval`                                  |                                              1 hour |

`ImmediateJobsStorageBuilder` exposes `UseInMemory()`, `UseStorage(factory)`,
`UseSingleServer()`, `UseSingleServer(factory)`, `UseDistributed()`, and
`UseDistributed(factory)`. Call `ConfigureStorage` at most once. If you omit it, Jobs uses
in-memory storage. A durable provider uses single-server mode unless you select a mode explicitly.
Redis always uses distributed mode. Provider extensions can use the builder's `Services` property
to register services with the application's `IServiceCollection`.

`FairQueueOptions` defaults to `Enabled = false`, `ConcurrencyShareThreshold = 0.10`,
`MinInflightForNoisy = 30`, and `GroupRoundRobin = true`. Calling any `UseFairQueues` overload sets
`Enabled` to `true`. Jobs validates `ImmediateJobsOptions` and `FairQueueOptions` at startup.

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
		JobExecutionQuery query, CancellationToken token = default);
	ValueTask<JobStatus?> GetJobAsync(string jobId, CancellationToken token = default);
	ValueTask<IReadOnlyList<BatchStatus>?> QueryBatchesAsync(
		BatchQuery query, CancellationToken token = default);
	ValueTask<BatchStatus?> GetBatchAsync(string batchId, CancellationToken token = default);
	ValueTask<IReadOnlyList<BatchMemberStatus>?> QueryBatchMembersAsync(
		string batchId, BatchMemberQuery query, CancellationToken token = default);
	ValueTask<BatchGraph?> GetBatchGraphAsync(
		string batchId, CancellationToken token = default);
}

sealed record BatchStatus(
	string Id, BatchState State,
	int Total, int Succeeded, int Failed, int Cancelled, int Skipped, int Remaining,
	DateTimeOffset CreatedAt, DateTimeOffset? StartedAt, DateTimeOffset? CompletedAt,
	double FractionSettled
);

sealed record JobExecutionRecord
{
	static JobExecutionRecord? CreateSynthetic(JobRecord job);
	string JobId { get; init; }
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
ValueTask CancelJobAsync(string jobId, CancellationToken token = default);
ValueTask RetryJobAsync(string jobId, CancellationToken token = default);
ValueTask CancelBatchAsync(string batchId, CancellationToken token = default);
ValueTask DeleteBatchAsync(string batchId, CancellationToken token = default);
ValueTask PauseRecurringAsync(string name, CancellationToken token = default);
ValueTask ResumeRecurringAsync(string name, CancellationToken token = default);
ValueTask TriggerRecurringAsync(string name, CancellationToken token = default);
```

Query objects enforce these rules:

- `JobQuery` can filter by ID, state, queue name, job name or search text for job names.
- `JobExecutionQuery` requires a job ID. An optional attempt number must be positive.
- `BatchQuery` and `BatchMemberQuery` can filter by state.
- IDs and text filters cannot be blank.
- `Skip` must be zero or greater. `Take` must be from 1 through 1,000 and defaults to 100.

`JobStatus`, `BatchStatus`, `BatchMemberStatus`, `BatchGraph`, `BatchGraphNode` and
`BatchGraphEdge` are read-only monitoring records. `FractionSettled` counts every finished result,
including `Skipped`. `QueryExecutionsAsync` returns saved attempts newest first unless
`JobExecutionQuery.Attempt` selects one. `IsSynthetic` is `true` when Jobs rebuilt execution data
from the owning `JobRecord` because no separate execution record was available.

`GetSnapshotAsync` reports the features supported by the current storage provider. `GetJobAsync`
includes the current job definition's `MaxAttempts` when that definition is available. Batch reads
return `null` when storage does not support graphs. `GetBatchAsync` and `GetBatchGraphAsync` also
return `null` when the batch does not exist.

`CancelJobAsync` cancels a job that has not finished. `RetryJobAsync` retries a failed job or runs
a scheduled job now. Batch commands require graph storage. Recurring commands require recurring
storage and use the saved schedule name. Blank IDs and names are rejected.

## Dashboard

```csharp
IServiceCollection AddImmediateJobsDashboard(
	this IServiceCollection services,
	Action<ImmediateJobsDashboardOptions>? configure = null);

RouteGroupBuilder MapImmediateJobsDashboard(
	this IEndpointRouteBuilder endpoints);
RouteGroupBuilder MapImmediateJobsDashboard(
	this IEndpointRouteBuilder endpoints, string prefix);
```

Call `AddImmediateJobsDashboard` before building the application. It registers the services and
endpoints used by the dashboard. Configure dashboard options in that call;
`MapImmediateJobsDashboard` only selects the default or custom path. Jobs validates the settings
when the host starts. `ImmediateJobsDashboardOptions.UpdateInterval` defaults to two seconds.

`AllowInAnyEnvironment()`, `RequireAuthorization(string policy)` and
`AddTelemetryLink(string label, JobTelemetryLinkKind kind,
Func<JobTelemetryLinkContext, Uri?> createUrl)` return the same options object. Without an
authorization policy, dashboard endpoints are restricted to the `Development` environment by
default. `AllowInAnyEnvironment()` removes that environment restriction. If you also configure an
authorization policy, the policy still applies. Link kinds are `Trace` and `Logs`.
`JobTelemetryLinkContext.Execution` is `null` for a job-level link and contains the exact
`JobExecutionRecord` for an execution-level link.

## Provider registration

```csharp
ImmediateJobsStorageBuilder UseEntityFrameworkCore<TContext>();
ModelBuilder AddImmediateJobs(string? schema = null);

ImmediateJobsStorageBuilder UseLinqToDB(DataOptions dataOptions, string? schema = null);
Task CreateImmediateJobsSchemaAsync(
	this DataOptions dataOptions, string? schema = null,
	CancellationToken token = default);

ImmediateJobsStorageBuilder UseRedis(
	string configuration, Action<RedisJobStorageOptions>? configure = null);
ImmediateJobsStorageBuilder UseRedis(
	IConnectionMultiplexer connection, Action<RedisJobStorageOptions>? configure = null);
```

`RedisJobStorageOptions` exposes `Database = -1` and `KeyPrefix = "immediate-jobs"`.

## NodaTime

Extension overloads mirror `ScheduleAsync(Duration)`, `ScheduleAtAsync(Instant)`, grouped variants,
`AddToBatch(Duration?)`, `AddToBatchAt(Instant)`, all three `ScheduleAfterAsync(Duration?)` forms,
and `AddOrUpdateRecurringAsync(..., DateTimeZone, ...)`. Serialization APIs are
`JsonSerializerOptions.UseNodaTime(...)`, `IServiceCollection.AddImmediateJobsNodaTime(...)` and
the three `NodaTimeJobSerializer` constructors. See the [NodaTime guide](/docs/Immediate.Jobs/nodatime)
for registration and examples.

## Testing

`CaptureOnlyJobScheduler<T>` exposes `Captures`, `Last`, `CancelledIds`, `Clear()` and virtual
scheduling/cancellation methods; each `ScheduledJobCapture<T>` contains `Id`, `Payload`, `RunAt`,
and `GroupId`. `Clear()` resets both captures and cancellations.
`CaptureOnlyRecurringJobScheduler` exposes the same capture pattern with
`RecurringJobCapture`/`RecurringJobOperation`.

`JobTestHarness` constructors accept optional service configuration and optional fake-time start;
it exposes `Services`, `Storage`, `TimeProvider`, and `Batches`. Operations are `DrainAsync`, both
`AdvanceTimeAndDrainAsync` overloads, `QueryJobsAsync`, both `GetJobAsync` overloads, both
`AssertEnqueuedAsync<T>` overloads, `AssertBatchCommittedAtomicallyAsync`,
`AssertContinuationReleasedAfterAsync`, `AssertCascadeSkippedAsync`,
`AssertCascadeCancelledAsync`, and `RunThroughPipelineAsync<T>`.

`JobStorageConformanceSuite.GetCases(StorageCapabilities)` returns an independent
`JobStorageConformanceTestCase` for each selected storage behavior. The suite works with any test
framework. Each case exposes `Name`, `RequiredCapabilities`, and
`RunAsync(IServiceProvider, CancellationToken)`. It checks the storage registration and reported
features before running. Tests that depend on time require a `FakeTimeProvider` registered as
`TimeProvider`.

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
or monitoring code.

`IJobStorage.RetryAsync` accepts `Failed` and `Scheduled`. A scheduled job moves to `Pending`
immediately without changing its attempt count or latest failure details.

`IJobStorage.CancelAsync` accepts jobs that have not finished. `DeleteAsync` accepts only final
states. Storage must reject updates from an older attempt after its lease expires or it is
cancelled. Worker updates match the job ID, execution number and worker ID. Graph changes match the
job ID and execution number.

Custom providers must implement
`QueryJobExecutionsAsync(JobExecutionQuery, ...)` and keep execution records until the owning job
or batch is deleted or purged.
