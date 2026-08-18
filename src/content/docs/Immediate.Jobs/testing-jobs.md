---
title: Testing jobs
description: Test scheduling and execution with a controllable clock, captured calls and workflow assertions.
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
`Storage`, `TimeProvider`, `Services` and `Batches`.

Register generated jobs in the callback, but do not call `ConfigureStorage`. The harness installs
its own in-memory provider and fake clock after application registrations.

For graphs, use `AssertBatchCommittedAtomicallyAsync`,
`AssertContinuationReleasedAfterAsync` and `AssertCascadeSkippedAsync`.
Call `RunThroughPipelineAsync<TPayload>` when a test already has a record and payload and needs to
run the generated handler with its registered behaviors and dependencies.

## Capture scheduling only

Use `CaptureOnlyJobScheduler<TPayload>` when a test only needs to verify what was scheduled and no
worker should run:

```csharp
var scheduler = new CaptureOnlyJobScheduler<SendWelcomeEmail.Payload>();
var payload = new SendWelcomeEmail.Payload(userId, "v2");
var handle = await scheduler.EnqueueAsync(
	payload,
	groupId: "tenant-a",
	cancellationToken: cancellationToken
);

var capture = scheduler.Last!;
Assert.Equal(handle.Id, capture.Id);
Assert.Equal(payload, capture.Payload);
Assert.Equal("tenant-a", capture.GroupId);

await scheduler.CancelAsync(handle, cancellationToken);
Assert.Contains(handle.Id, scheduler.CancelledIds);
```

`Captures` preserves call order, `Last` returns the newest call, and `CancelledIds` records
cancellations of captured handles. `Clear()` resets both collections. Captures include payload,
run time, group ID and generated handle. `CaptureOnlyRecurringJobScheduler` records
add/update/remove/trigger operations for payloadless dynamic schedules. Override the capture
scheduler's ID creation when stable IDs make assertions clearer.

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
- use separate data, such as a unique database, schema or key prefix.

`FakeTimeProvider` comes from `Microsoft.Extensions.Time.Testing` in the
`Microsoft.Extensions.TimeProvider.Testing` package. `GetCases` always includes queue tests. It
adds recurring, graph, fair-queue and replica tests based on `StorageCapabilities`, and verifies
the provider reports those features before each test runs.

The `Replica` flag covers `IJobStorageReplica`; `IJobGraphStorageReplica` has no separate flag. For
a provider that supports single-server mode, also run the relevant cases through its
single-server registration. This tests both replica interfaces.

The graph tests verify that an older execution cannot add work after a newer attempt starts. They
also cover continuations added after a parent finishes and jobs added with a batch ID that does not
match the running batch. A rejected addition must not leave partial data behind.

The suite does not choose a test framework or database tooling. Keep separate provider tests for
migrations, database-specific behavior, Redis key layout and scripts, connection ownership and
backend failures. Dispose the service provider before deleting its test data.
