---
title: Testing jobs
description: Test scheduling and execution deterministically with fake time, draining, captures and workflow assertions.
order: 15
group: Guides
---

```bash
dotnet add package Immediate.Jobs.Testing --prerelease
```

## Execute with fake time

`JobTestHarness` builds an in-memory, full-capability scheduler around a
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

`DrainAsync` runs everything due without wall-clock sleeps. `AdvanceTimeAndDrainAsync` accepts a
`TimeSpan` or absolute `DateTimeOffset`. `QueryJobsAsync` and `GetJobAsync` inspect durable records;
`AssertEnqueuedAsync<TPayload>` validates state and deserializes the payload. The harness also
exposes `Storage`, `TimeProvider`, `Services` and `Batches`. Register generated jobs in the callback,
but do not call `ConfigureStorage`; the harness installs its own in-memory provider and fake clock
after application registrations.

For graphs, use `AssertBatchCommittedAtomicallyAsync`,
`AssertContinuationReleasedAfterAsync` and `AssertCascadeSkippedAsync`.
Call `RunThroughPipelineAsync<TPayload>` when a test already has a record/payload and needs to execute
its generated invoker through the real DI/behavior pipeline.

## Capture scheduling only

Use `CaptureOnlyJobScheduler<TPayload>` when the subject should decide _what_ to schedule but no
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

Testing helpers throw `JobTestAssertionException` with job/batch-specific mismatch details. They
exercise the same generated JSON metadata and storage state machine as production without relying
on wall-clock delays.

## Test a storage provider

Storage-provider authors can run the shared storage behavior tests through the provider's normal
public DI registration. Choose the capability flags that exactly match the interfaces implemented
by the resolved `IJobStorage`. Expose every returned case separately to the test runner:

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

Create a fresh service provider for every case. It must resolve exactly one `IJobStorage` and
register a `FakeTimeProvider` as `TimeProvider`. Give each case separate backend data by using a
unique database, schema, key prefix, or similar boundary. `FakeTimeProvider` comes from
`Microsoft.Extensions.Time.Testing` in the `Microsoft.Extensions.TimeProvider.Testing` package.
`GetCases` always includes the queue tests and adds recurring, graph, fair-queue, and replica tests
selected by `StorageCapabilities`. Before each behavior runs, `RunAsync` checks that the storage
interfaces exactly match those flags.

The catalog has no dependency on xUnit, NUnit, MSTest, Testcontainers, an ORM, or a database
driver. Use a fixture wrapper when cleanup needs the provider, connection, and backend identifier;
dispose the service provider before deleting its isolated data. Keep provider-specific tests for
migrations, database-specific behavior, Redis layout and scripts, connection ownership, and
simulated backend failures.
