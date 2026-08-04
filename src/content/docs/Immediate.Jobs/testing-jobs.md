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
	services.AddMyAppJobs(options => options.UseInMemory());
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
exposes `Storage`, `TimeProvider`, `Services` and `Batches`.

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
