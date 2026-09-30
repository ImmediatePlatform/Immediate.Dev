---
title: Testing jobs
description: Test scheduling and execution with a controllable clock, captured storage writes and workflow assertions.
order: 15
group: Guides
---

```bash
dotnet add package Immediate.Jobs.Testing --prerelease
```

## Execute with fake time

`JobTestHarness` builds an in-memory scheduler with every feature and a controllable
`FakeTimeProvider`. Register the generated jobs and their dependencies:

```csharp
await using var harness = new JobTestHarness(services =>
{
	services.AddMyAppHandlers();
	services.AddMyAppJobs();
	services.AddSingleton<IEmailSender, RecordingEmailSender>();
});

await using var scope = harness.Services.CreateAsyncScope();
var scheduler = scope.ServiceProvider.GetRequiredService<SendWelcomeEmail.Scheduler>();
var handle = await scheduler.ScheduleAsync(
	new(userId, "v2"),
	TimeSpan.FromMinutes(10),
	cancellationToken
);

var queued = await harness.AssertEnqueuedAsync<SendWelcomeEmail.Payload>(
	handle,
	JobState.Scheduled,
	cancellationToken
);
Assert.Equal(userId, queued.Payload.UserId);

await harness.AdvanceTimeAndDrainAsync(TimeSpan.FromMinutes(10), cancellationToken);
Assert.Equal(JobState.Succeeded, (await harness.GetJobAsync(handle, cancellationToken)).State);
```

`DrainAsync` runs every due job immediately. `AdvanceTimeAndDrainAsync` moves the clock by a
`TimeSpan` or to a `DateTimeOffset`, then runs due jobs. `QueryJobsAsync` and `GetJobAsync` read saved
job records. `AssertEnqueuedAsync<TPayload>` checks the state and payload. The harness also exposes
`Storage`, `TimeProvider`, `Services`, `Batches` and the production scheduling service.

Register generated jobs in the callback, but do not call `ConfigureStorage`. The harness installs
its own in-memory provider and fake clock after application registrations. It runs one worker by
default; pass an `Action<ImmediateJobsOptions>` as the last constructor argument to change worker
options.

For graphs, use `AssertBatchCommittedAtomicallyAsync`,
`AssertContinuationReleasedAfterAsync` and `AssertCascadeSkippedAsync`.
Call `RunThroughPipelineAsync<TPayload>` when a test already has a record and payload and needs to
run the generated handler with its registered behaviors and dependencies.

## Simulate a restart

`ResetScheduler()` rebuilds `Services`, `Batches` and `Scheduler` as if the application restarted,
while keeping `Storage` and `TimeProvider`. Use it to test what happens to saved work and recurring
schedules across deployments and downtime:

```csharp
await using var harness = new JobTestHarness(services =>
{
	services.AddMyAppHandlers();
	services.AddMyAppJobs();
});

await harness.DrainAsync(cancellationToken);

// The application is down while three five-minute occurrences pass.
harness.TimeProvider.Advance(TimeSpan.FromMinutes(17));
harness.ResetScheduler();

await harness.DrainAsync(cancellationToken);
Assert.Single(
	harness.Storage.RecurringMaterializations,
	m => m.Schedule.Name == "cleanup-sessions" && m.Job.State == JobState.Pending
);
```

`CleanupSessionsJob` from [Recurring jobs](/docs/Immediate.Jobs/recurring-jobs) uses the default
`EnqueueOne` mode, so it gets a single catch-up run for the missed occurrences. The first drain
after a reset merges code-defined recurring schedules again and applies each job's
`MisfireHandlingMode` to occurrences missed while the clock moved.

## Inspect captured storage writes

`JobTestHarness.Storage` is a `CapturingJobStorage` behind the production generated schedulers. It
records writes while keeping jobs available for queries, cancellation and execution:

```csharp
await using var harness = new JobTestHarness(services => services.AddMyAppJobs());
await using var scope = harness.Services.CreateAsyncScope();
var scheduler = scope.ServiceProvider.GetRequiredService<SendWelcomeEmail.Scheduler>();
var payload = new SendWelcomeEmail.Payload(userId, "v2");
var handle = await scheduler.EnqueueAsync(
	payload,
	groupId: "tenant-a",
	cancellationToken: cancellationToken
);

var captured = harness.Storage.FindJob(handle)!;
Assert.Equal(handle, captured.JobHandle);
Assert.Equal("tenant-a", captured.GroupId);

await scheduler.CancelAsync(handle, cancellationToken);
Assert.Equal(JobState.Cancelled, (await harness.GetJobAsync(handle, cancellationToken)).State);
```

Use `Jobs`, `Continuations`, `Batches`, `BatchJobs`, `DynamicContinuations`,
`RecurringOperations` and `RecurringMaterializations` for the complete call history. Each property
returns a stable snapshot in call order. `RecurringSchedules` returns the currently saved schedules
keyed by schedule name. `FindJob` and `FindBatch` locate one
captured write by its typed handle. `Clear()` resets the capture log without deleting the jobs held
by the inner in-memory storage.

Recurring operations distinguish add/update, remove, pause and resume. Materializations record the
saved schedule, the new job, any continuation dependencies created by `OverlapPolicy.Queue` and the
next run time.

`CapturingJobStorage` is not sealed, and every storage method is `virtual`. Derive from it to make a
storage call fail or wait in a test, then pass your instance where the test needs it. Call
`LoadPersistedJobState` to seed jobs, batches, continuation edges and recurring schedules before
the test starts. Batch captures include the batch header, jobs and
dependency edges, including continuation delays.

Failed checks throw `JobTestAssertionException` with details about the job or batch. The helpers
use the same serialization and execution paths as production while the fake clock avoids delays.

## Test a storage provider

Storage-provider authors can run the shared behavior tests with the same registration an
application would use. Choose the `StorageCapabilities` flags that match the provider and expose
each returned case separately to the test runner:

```csharp
using Immediate.Jobs.Shared.Storage;
using Immediate.Jobs.Testing;
using Microsoft.Extensions.Time.Testing;

private const StorageCapabilities Capabilities =
	StorageCapabilities.Queue |
	StorageCapabilities.Recurring;

public static TheoryData<JobStorageConformanceTestCase> Cases =>
	[.. JobStorageConformanceSuite.GetCases(Capabilities)];

[Theory]
[MemberData(nameof(Cases))]
public async Task StorageConforms(JobStorageConformanceTestCase testCase)
{
	await using var fixture = await AcmeStorageFixture.CreateAsync();
	await testCase.RunAsync(fixture.Services);
}
```

For each case:

- create a fresh service provider that resolves exactly one `IJobStorage`;
- register `FakeTimeProvider` as `TimeProvider`;
- use separate data, such as a unique database, schema or key prefix;
- store the case's `PersistedJobState` before calling `RunAsync`.

`PersistedJobState` holds the `Jobs`, `Batches`, `Edges` and `RecurringSchedules` that a case
expects to find in storage, for example to check that a provider restores an existing batch graph.
Most cases have empty lists. The built-in providers expose a `LoadPersistedJobState` method for
this; a custom provider fixture can insert the rows directly:

```csharp
await using var fixture = await AcmeStorageFixture.CreateAsync();
await fixture.SeedAsync(testCase.PersistedJobState);
await testCase.RunAsync(fixture.Services);
```

`FakeTimeProvider` comes from `Microsoft.Extensions.Time.Testing` in the
`Microsoft.Extensions.TimeProvider.Testing` package. `GetCases` always includes queue tests. It
adds recurring, graph, fair-queue and replica tests based on `StorageCapabilities`, and verifies
the provider reports those features before each test runs.

`AllCasesByName` provides a case-insensitive lookup of every known case. A test runner can use it
when it stores a case name and later needs the matching `JobStorageConformanceTestCase`.

The `Replica` flag covers `IJobStorageReplica`; `IJobGraphStorageReplica` has no separate flag. For
a provider that supports single-server mode, also run the relevant cases through its
single-server registration. This tests both replica interfaces.

The graph tests verify that an older execution cannot add work after a newer attempt starts. They
also cover continuations added after a parent finishes and jobs added with a batch ID that does not
match the running batch. A rejected addition must not leave partial data behind.

The suite does not choose a test framework or database tooling. Keep separate provider tests for
migrations, database-specific behavior, Redis key layout and scripts, connection ownership and
backend failures. Dispose the service provider before deleting its test data.
