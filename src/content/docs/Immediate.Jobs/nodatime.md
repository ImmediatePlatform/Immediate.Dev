---
title: NodaTime
description: Use NodaTime values for scheduling, recurring time zones, job payloads and propagated context.
order: 5
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

`Immediate.Jobs.NodaTime` adds NodaTime scheduling overloads and configures the job serializer for
NodaTime values in payloads and propagated context.

## Install and register

```bash
dotnet add package Immediate.Jobs.NodaTime --prerelease
```

Register the integration with Jobs:

```csharp title="Program.cs"
using Immediate.Jobs.NodaTime;

builder.Services.AddMyAppHandlers();
builder.Services.AddMyAppJobs(options => options.UseInMemory());
builder.Services.AddImmediateJobsNodaTime();
```

`AddImmediateJobsNodaTime()` replaces the default `IJobSerializer` with
`NodaTimeJobSerializer`. By default, that serializer uses `JsonSerializerDefaults.Web` and
`DateTimeZoneProviders.Tzdb`. Pass an `IDateTimeZoneProvider` when the application uses a different
provider:

```csharp
using NodaTime;

IDateTimeZoneProvider timeZoneProvider = DateTimeZoneProviders.Tzdb;
builder.Services.AddSingleton(timeZoneProvider);
builder.Services.AddImmediateJobsNodaTime(timeZoneProvider);
```

Every worker that reads the stored jobs must use a provider that recognizes the same time-zone
IDs.

## Schedule with `Duration` and `Instant`

The generated scheduler remains the service you inject. Import `Immediate.Jobs.NodaTime` to make
the extension overloads available:

```csharp
using Immediate.Jobs.NodaTime;
using NodaTime;

[Handler, Job]
public sealed partial class ReconcilePayment(IPaymentProvider payments)
{
	public sealed record Payload(Guid OrderId, Instant ExpectedSettlementAt);

	private ValueTask HandleAsync(Payload payload, CancellationToken cancellationToken) =>
		payments.ReconcileAsync(payload.OrderId, payload.ExpectedSettlementAt, cancellationToken);
}

public sealed class PaymentScheduler(ReconcilePayment.Scheduler reconciliation, IClock clock)
{
	public ValueTask<JobHandle> RetryAsync(Guid orderId, CancellationToken cancellationToken)
	{
		var expectedSettlement = clock.GetCurrentInstant() + Duration.FromHours(2);

		return reconciliation.ScheduleAsync(
			new(orderId, expectedSettlement),
			Duration.FromMinutes(10),
			cancellationToken
		);
	}

	public ValueTask<JobHandle> AtSettlementAsync(Guid orderId, CancellationToken cancellationToken)
	{
		var expectedSettlement = clock.GetCurrentInstant() + Duration.FromHours(2);

		return reconciliation.ScheduleAtAsync(
			new(orderId, expectedSettlement),
			expectedSettlement,
			cancellationToken
		);
	}
}
```

The package converts `Duration` to `TimeSpan` and `Instant` to `DateTimeOffset` before calling the
core scheduler. It does not replace Immediate.Jobs' `TimeProvider`; inject `IClock` only when your
application code benefits from a NodaTime clock.

The complete scheduling surface is:

| Operation                                          | NodaTime value | Notes                                                    |
| -------------------------------------------------- | -------------- | -------------------------------------------------------- |
| `ScheduleAsync`                                    | `Duration`     | Relative delay, with an optional fair-queue group ID.    |
| `ScheduleAtAsync`                                  | `Instant`      | Absolute time, with an optional fair-queue group ID.     |
| `AddToBatch`                                       | `Duration?`    | Delayed atomic-batch member.                             |
| `AddToBatchAt`                                     | `Instant`      | Atomic-batch member at an absolute time.                 |
| `ScheduleAfterAsync(JobHandle, ...)`               | `Duration?`    | Delayed continuation after one job.                      |
| `ScheduleAfterAsync(ReadOnlySpan<JobHandle>, ...)` | `Duration?`    | Delayed fan-in continuation after every supplied parent. |
| `ScheduleAfterAsync(BatchHandle, ...)`             | `Duration?`    | Delayed continuation after a whole batch.                |

Batch and continuation overloads otherwise retain the behavior described in
[Batches and continuations](/docs/Immediate.Jobs/batches-and-continuations), including trigger and
storage-capability requirements.

## Use `DateTimeZone` for dynamic schedules

The recurring overload accepts a `DateTimeZone` and persists its `Id`:

```csharp
using Immediate.Jobs.NodaTime;
using NodaTime;

[Handler, Job(Name = "payment-reconciliation")]
public sealed partial class PaymentReconciliation(IPaymentProvider payments)
{
	private ValueTask HandleAsync(
		EmptyJobRequest request,
		CancellationToken cancellationToken
	) => payments.ReconcileOutstandingAsync(cancellationToken);
}

public sealed class PaymentScheduleSetup(PaymentReconciliation.Scheduler reconciliation)
{
	public ValueTask ConfigureAsync(CancellationToken cancellationToken)
	{
		var vienna = DateTimeZoneProviders.Tzdb["Europe/Vienna"];

		return reconciliation.AddOrUpdateRecurringAsync(
			"daily-payment-reconciliation",
			"0 3 * * *",
			vienna,
			cancellationToken
		);
	}
}
```

This overload is available on `IRecurringJobScheduler`, including the generated scheduler for a
payloadless job without a code-defined cron expression. Cron parsing, reconciliation, overlap and
manual-trigger behavior are covered in [Recurring jobs](/docs/Immediate.Jobs/recurring-jobs).

## Serialize NodaTime values

The registration above applies the standard `NodaTime.Serialization.SystemTextJson` converters to
the serializer used for job payloads and context snapshots. Generated jobs continue to supply
their source-generated `JsonTypeInfo<T>` metadata, including for payloads such as
`ReconcilePayment.Payload` above.

For application-owned serializer settings, pass your options to `NodaTimeJobSerializer`; its
constructor adds the NodaTime converters:

```csharp
using System.Text.Json;
using Immediate.Jobs.NodaTime;
using NodaTime;

var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
{
	WriteIndented = false,
};

IJobSerializer serializer = new NodaTimeJobSerializer(
	jsonOptions,
	DateTimeZoneProviders.Tzdb
);
```

Call `JsonSerializerOptions.UseNodaTime(...)` when you need the same converters on options used
outside `IJobSerializer`. `NodaTimeJobSerializer` also has parameterless and
`IDateTimeZoneProvider` constructors. If you replace `IJobSerializer` yourself, register the
configured serializer after Jobs registration.

<Callout type="warning" title="The companion package is required">

When a Jobs project references NodaTime without referencing `Immediate.Jobs.NodaTime`, analyzer
error `IJOB0004` is reported at the compilation level. Install the companion package even if the
NodaTime value appears only inside a job context snapshot.

</Callout>
