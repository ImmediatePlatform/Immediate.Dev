---
title: API reference
description: Application-facing Immediate.Jobs attributes, schedulers, options, monitoring, management, providers and testing contracts.
order: 16
group: Reference
---

This reference groups the supported application surface. Generated scheduler methods are shown on
their public base contracts even though application code normally uses `YourJob.Scheduler`.

## Namespaces

| Namespace                          | Surface                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `Immediate.Jobs.Shared`            | Declarations, handles, generated scheduler base, batches and configuration. |
| `Immediate.Jobs.Shared.Interfaces` | Scheduler, recurring, monitoring, serialization and ID contracts.           |
| `Immediate.Jobs.Shared.Apis`       | `JobMonitor` plus job, execution, batch and monitoring data types.          |
| `Immediate.Jobs.Shared.Storage`    | Storage contracts, capability markers and persistence records.              |

Provider extensions remain under `Immediate.Jobs.EntityFrameworkCore`,
`Immediate.Jobs.LinqToDB`, and `Immediate.Jobs.Redis`. The generated `AddXxxJobs` extension and
`RecurringJobs` dispatcher are emitted into the consuming project's `RootNamespace`.

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
`UseDistributed(factory)`. `ConfigureStorage` may be called only once. No storage configuration
means in-memory; selecting a durable factory without an explicit topology means single-server.
Provider extensions attach to this storage builder, and Redis selects distributed mode itself. The
builder's `Services` property exposes the `IServiceCollection` for provider-specific registration.

`FairQueueOptions` has `Enabled = false`, `ConcurrencyShareThreshold = 0.10`,
`MinInflightForNoisy = 30`, and `GroupRoundRobin = true`; every `UseFairQueues` overload enables it.
Both option types use startup validation.

## Serialization and telemetry

`IJobSerializer` exposes generic `Serialize`/`Deserialize` pairs both with and without a generated
`JsonTypeInfo<T>` factory. `SystemTextJsonJobSerializer` uses web defaults and exposes `Options`.
Generated jobs always call the metadata-factory overload. Traces and metrics use the stable
`Immediate.Jobs` activity-source and meter names.

## Monitoring and management

`JobMonitor` is the main monitoring and management API for application code. It has a scoped
lifetime. `IJobMonitor` exposes its read-only subset and resolves to the same instance. Inject the
interface when a test needs only those reads.

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

`JobQuery` can filter by ID, state, queue name, job name, or job-name search text.
`JobExecutionQuery` requires a job ID and can select one attempt. That attempt must be positive.
`BatchQuery` and `BatchMemberQuery` can filter by state. IDs and text filters cannot be empty.
Every query has `Skip` and `Take`; `Skip` must be zero or greater, and `Take` must be from 1 through
1,000. The default `Take` is 100.

`JobStatus`, `BatchStatus`, `BatchMemberStatus`, `BatchGraph`, `BatchGraphNode` and
`BatchGraphEdge` are immutable monitoring records. `FractionSettled` includes every terminal
outcome, including `Skipped`. `QueryExecutionsAsync` returns retained executions newest first
unless `JobExecutionQuery.Attempt` selects one. `IsSynthetic` marks a best-effort record rebuilt
from the owning `JobRecord` when a separate execution entry is unavailable.

`GetSnapshotAsync` includes the detected storage capabilities. `GetJobAsync` adds the current
generated job definition's `MaxAttempts` value when the definition is available. Batch reads
return `null` when storage does not support graphs. `GetBatchAsync` and `GetBatchGraphAsync` also
return `null` when the batch does not exist.

`CancelJobAsync` cancels non-terminal work. `RetryJobAsync` retries failed work or runs scheduled
work now. Batch commands require graph storage. Recurring commands require recurring storage and
use the persisted schedule name. All command identifiers and names must contain text.

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

Call `AddImmediateJobsDashboard` before building the application. It registers the dashboard's
generated Immediate.Apis handlers and Immediate.Validations behavior. Configure dashboard options
in that registration call; `MapImmediateJobsDashboard` only selects the default or custom path.
Options are validated when the host starts. `ImmediateJobsDashboardOptions.UpdateInterval` defaults
to two seconds.
`AllowInAnyEnvironment()`, `RequireAuthorization(string policy)` and
`AddTelemetryLink(string label, JobTelemetryLinkKind kind,
Func<JobTelemetryLinkContext, Uri?> createUrl)` return the same options object. Without an
authorization policy, dashboard endpoints are restricted to the `Development` environment by
default; `AllowInAnyEnvironment()` explicitly disables that restriction. A configured
authorization policy remains authoritative. Link kinds are `Trace` and `Logs`.
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

`JobStorageConformanceSuite.GetCases(StorageCapabilities)` returns one
`JobStorageConformanceTestCase` for each storage behavior. The catalog is not tied to a test
framework. Each case exposes `Name`, `RequiredCapabilities`, and
`RunAsync(IServiceProvider, CancellationToken)`. Before a case runs, it checks the storage
registration and its feature flags. Tests that depend on time use a `FakeTimeProvider` registered
as `TimeProvider`.

## Custom storage contracts

| Interface                 | Purpose                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IJobStorage`             | Initialize; enqueue; lease/acquire/renew; persist/query execution history; complete/fail; status; cancel/retry/delete/purge; heartbeat and health. |
| `IRecurringJobStorage`    | Upsert/remove/pause/resume schedules; identify due rows; uniquely materialize each occurrence; reconcile obsolete code-defined schedules.          |
| `IJobGraphStorage`        | Atomically enqueue batches/edges; settle and release/skip dependencies; add mid-run members; monitor/cancel/delete/purge graphs.                   |
| `IFairQueueStorage`       | Apply fair acquisition when a policy is supplied, including group rotation and protection for quieter groups.                                      |
| `IJobStorageReplica`      | Acquire the exact job IDs selected by the single-server in-memory queue.                                                                           |
| `IJobGraphStorageReplica` | Read incoming continuation edges during single-server startup recovery.                                                                            |

`StorageCapabilities` flags are `Queue`, `Recurring`, `Graph`, `FairQueues`, and `Replica`. Call
`storage.GetCapabilities()` to detect these features. `Replica` represents `IJobStorageReplica`.
Single-server storage also requires `IJobGraphStorageReplica`, `IRecurringJobStorage`, and
`IJobGraphStorage`.

Low-level `JobRecord`, acquisition, definition and graph persistence records are provider
contracts, not application scheduling or monitoring APIs.
`IJobStorage.RetryAsync` accepts `Failed` and `Scheduled`: a scheduled invocation is moved to
`Pending` immediately while retaining its attempt count and latest failure details.
`IJobStorage.CancelAsync` accepts any non-terminal state, while `DeleteAsync` accepts terminal
states only. Worker-owned telemetry, renewal, completion and failure are fenced by job ID,
execution number and worker ID; graph expansion is fenced by job ID and execution number. An
expired or cancelled attempt therefore cannot mutate a newer durable state. Custom providers must
implement `QueryJobExecutionsAsync(JobExecutionQuery, ...)` and retain execution rows for the
lifetime of their owning job or batch.
