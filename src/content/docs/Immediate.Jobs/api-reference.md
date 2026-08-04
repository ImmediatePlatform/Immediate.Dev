---
title: API reference
description: Application-facing Immediate.Jobs attributes, schedulers, options, monitoring, providers and testing contracts.
order: 16
group: Reference
---

This reference groups the supported application surface. Generated scheduler methods are shown on
their public base contracts even though application code normally uses `YourJob.Scheduler`.

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

public abstract class JobContextExtractor
{
	public abstract string Key { get; }
}

public abstract class JobContextExtractor<TContext> : JobContextExtractor
{
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
JobHandle AddToBatch(JobBatch batch, TPayload payload, TimeSpan? delay = null);
JobHandle AddToBatchInGroup(
	JobBatch batch, TPayload payload, string? groupId, TimeSpan? delay = null);
JobHandle AddToBatchAt(JobBatch batch, TPayload payload, DateTimeOffset runAt);
JobHandle AddToBatchAt(
	JobBatch batch, TPayload payload, DateTimeOffset runAt, string? groupId);

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

public sealed class JobBatch : IAsyncDisposable
{
	public string Id { get; }
	public ValueTask<BatchHandle> CommitAsync(CancellationToken token = default);
}

interface IJobBatchScheduler
{
	ValueTask CancelAsync(BatchHandle handle, CancellationToken token = default);
	JobBatch Begin();
	JobBatch Begin(BatchHandle after, ContinuationTrigger on = ContinuationTrigger.Success);
	ValueTask<BatchHandle> RunAsync(
		Func<JobBatch, ValueTask> body, CancellationToken token = default);
}
```

`BatchState` is `Executing`, `Succeeded`, `Failed`, or `Cancelled`.

## Runtime configuration

`AddXxxJobs(Action<ImmediateJobsOptions>? configure = null, params ... tags)` returns
`ImmediateJobsBuilder`.

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
| `StorageMode`                                    |     `InMemory` when no storage provider is selected |

Fluent methods are `UseInMemory()`, `UseStorage(factory)`, `UseSingleServer()`,
`UseSingleServer(factory)`, `UseDistributed()` and `UseFairQueues(configure)`. `FairQueueOptions`
has `ConcurrencyShareThreshold = 0.10`, `MinInflightForNoisy = 30`, and
`GroupRoundRobin = true`. Builder extensions are `UseIdGenerator<TGenerator>()` and
`AddHealthCheck(name = "immediate-jobs", failureStatus = null, tags = null)`.

`ImmediateJobsOptions.StorageMode` starts as `SingleServer`, which is the default topology when a
durable factory does not select another mode. During registration, however, no selected storage
factory causes Jobs to call `UseInMemory()`; the effective no-provider mode is therefore
`InMemory`.

## Serialization and telemetry

`IJobSerializer` exposes generic `Serialize`/`Deserialize` pairs both with and without a generated
`JsonTypeInfo<T>` factory. `SystemTextJsonJobSerializer` uses web defaults and exposes `Options`.
Generated jobs always call the metadata-factory overload. `JobTelemetry.ActivitySource` and
`JobTelemetry.Meter` are the public OpenTelemetry entry points.

## Monitoring

```csharp
interface IJobMonitor
{
	ValueTask<JobStatus?> GetJobAsync(string jobId, CancellationToken token = default);
}

interface IJobBatchMonitor
{
	ValueTask<BatchStatus?> GetStatusAsync(string batchId, CancellationToken token = default);
	ValueTask<IReadOnlyList<BatchMemberStatus>> QueryMembersAsync(
		string batchId, BatchMemberQuery query, CancellationToken token = default);
	ValueTask<BatchGraph?> GetGraphAsync(string batchId, CancellationToken token = default);
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

sealed record JobExecutionQuery
{
	const int MaximumTake = 1000;
	void Validate();
	string JobId { get; init; }
	int? Attempt { get; init; }
	int Skip { get; init; }
	int Take { get; init; } // 100
}
```

`BatchMemberQuery` and `JobBatchQuery` contain optional state, `Skip`, and `Take = 100`.
`JobStatus`, `BatchStatus`, `BatchMemberStatus`, `BatchGraph`, `BatchGraphNode` and
`BatchGraphEdge` are immutable monitoring records. `FractionSettled` includes every terminal
outcome, including `Skipped`. `IJobStorage.QueryJobExecutionsAsync` returns retained executions
newest first unless `JobExecutionQuery.Attempt` selects an exact one. `IsSynthetic` marks a
best-effort record reconstructed from the owning `JobRecord` when a separate execution entry is
unavailable.

## Dashboard

```csharp
IServiceCollection AddImmediateJobsDashboard(
	this IServiceCollection services,
	Action<ImmediateJobsDashboardOptions>? configure = null);

RouteGroupBuilder MapImmediateJobsDashboard(
	this IEndpointRouteBuilder endpoints,
	Action<ImmediateJobsDashboardOptions>? configure = null);
RouteGroupBuilder MapImmediateJobsDashboard(
	this IEndpointRouteBuilder endpoints, string prefix,
	Action<ImmediateJobsDashboardOptions>? configure = null);
```

Call `AddImmediateJobsDashboard` before building the application. It registers the dashboard's
generated Immediate.Apis handlers and Immediate.Validations behavior. `MapImmediateJobsDashboard`
also accepts an optional configuration callback, but service registration is the preferred
configuration point. `ImmediateJobsDashboardOptions.UpdateInterval` defaults to two seconds.
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
ImmediateJobsOptions UseEntityFrameworkCore<TContext>();
ModelBuilder AddImmediateJobs(string? schema = null);

ImmediateJobsOptions UseLinqToDB(DataOptions dataOptions, string? schema = null);
Task CreateImmediateJobsSchemaAsync(
	this DataOptions dataOptions, string? schema = null,
	CancellationToken token = default);

ImmediateJobsOptions UseRedis(
	string configuration, Action<RedisJobStorageOptions>? configure = null);
ImmediateJobsOptions UseRedis(
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

## Custom storage contracts

| Interface              | Atomic responsibilities                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IJobStorage`          | Initialize; enqueue; lease/acquire/renew; persist/query execution history; complete/fail; status; cancel/retry/delete/purge; heartbeat and health. |
| `IRecurringJobStorage` | Upsert/remove/pause/resume schedules; identify due rows; uniquely materialize each occurrence; reconcile obsolete code-defined schedules.          |
| `IJobGraphStorage`     | Atomically enqueue batches/edges; settle and release/skip dependencies; add mid-run members; monitor/cancel/delete/purge graphs.                   |
| `IJobStorageReplica`   | Restore durable records and mirror explicit acquisitions for the single-server wrapper.                                                            |

`StorageCapabilities` flags are `Queue`, `Recurring` and `Graph`; call
`storage.GetCapabilities()` to detect the optional interfaces. Low-level `JobRecord`, acquisition,
definition and graph persistence records are provider contracts, not application scheduling APIs.
`IJobStorage.RetryAsync` accepts `Failed` and `Scheduled`: a scheduled invocation is moved to
`Pending` immediately while retaining its attempt count and latest failure details.
`IJobStorage.CancelAsync` accepts any non-terminal state, while `DeleteAsync` accepts terminal
states only. Worker-owned telemetry, renewal, completion and failure are fenced by job ID,
execution number and worker ID; graph expansion is fenced by job ID and execution number. An
expired or cancelled attempt therefore cannot mutate a newer durable state. Custom providers must
implement `QueryJobExecutionsAsync(JobExecutionQuery, ...)` and retain execution rows for the
lifetime of their owning job or batch.
