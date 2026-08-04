---
title: Creating jobs
description: Declare payload and payloadless jobs, choose stable names, and configure execution and retry policy.
order: 2
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

A job is a non-nested `partial` class carrying both `[Handler]` and `[Job]`. It declares exactly
one private instance `HandleAsync` method returning `ValueTask`; its request comes first and
`CancellationToken` last. Dependencies between those two parameters are resolved through the
normal [Immediate.Handlers pipeline](/docs/Immediate.Handlers/creating-handlers).

```csharp
[Handler, Job(Name = "send-welcome-email", MaxAttempts = 5, Timeout = "00:02:00")]
public sealed partial class SendWelcomeEmail(IEmailSender sender)
{
	public sealed record Payload(Guid UserId, string Template);

	private ValueTask HandleAsync(Payload payload, CancellationToken cancellationToken) =>
		new(sender.SendAsync(payload.UserId, payload.Template, cancellationToken));
}
```

## Payload and payloadless jobs

A payload is persisted as JSON. It must be source-generatable by `System.Text.Json`: use public
readable properties and supported concrete types. One-dimensional arrays, `List<T>` and
`Dictionary<TKey, TValue>` receive generated collection metadata; other `IEnumerable<T>` shapes
such as `HashSet<T>`, multidimensional arrays and dictionaries with unsupported key types are
rejected. Interfaces, abstract types, open generics, pointers, delegates, ref-like types and
unsupported `System` types are also rejected.

Prefer records or classes with a public constructor whose parameters match their public members.
Public `init` properties that are not constructor parameters are also supported, including
optional and `required` properties; generated metadata initializes them through an object
initializer. Constructor availability is not currently an analyzer error, so a type that receives
metadata but cannot be constructed by `System.Text.Json` can still fail when a worker deserializes
it. Generated metadata is used for both serialization and Native AOT; no reflection fallback is
needed.

A payloadless job receives `EmptyJobRequest`:

```csharp
[Handler, Job(Cron = "0 */5 * * * *", TimeZone = "Europe/Vienna")]
public sealed partial class CleanupSessionsJob(AppDbContext db)
{
	private ValueTask HandleAsync(EmptyJobRequest request, CancellationToken cancellationToken) =>
		new(db.DeleteExpiredSessions(cancellationToken));
}
```

Only payloadless jobs can have a cron schedule. Payloadless jobs without `Cron` instead receive a
dynamic recurring scheduler.

## Stable persisted names

`Name` is persisted and connects stored rows to the generated definition. When omitted it is
derived from the class name (`SendWelcomeEmailJob` becomes `send-welcome-email`). Set an
explicit name before production and do not casually rename it: old rows retain the old value and
will fail when no matching definition is registered. Names must contain a letter or digit and be
unique in the assembly. Persisted identifiers use ordinal, case-sensitive matching, so casing is
part of the contract too.

## Execution policy

```csharp
[Job(
	Name = "send-welcome-email",
	MaxAttempts = 5,
	Timeout = "00:02:00",
	MaxConcurrency = 8,
	Backoff = BackoffStrategy.ExponentialJitter,
	BackoffBase = "00:00:05"
)]
```

| Setting          |             Default | Meaning                                                            |
| ---------------- | ------------------: | ------------------------------------------------------------------ |
| `MaxAttempts`    |                 `3` | Total attempts including the first; must be at least one.          |
| `Timeout`        |              `null` | Per-attempt timeout as an invariant `TimeSpan`; `null` means none. |
| `MaxConcurrency` |                 `0` | Maximum simultaneous executions per node; zero is unbounded.       |
| `Backoff`        | `ExponentialJitter` | `Fixed`, `Exponential`, or bounded `ExponentialJitter`.            |
| `BackoffBase`    |          `00:00:05` | Positive base retry delay.                                         |
| `OverlapPolicy`  |              `Skip` | Recurring-only: `Skip`, `Queue`, or `Concurrent`.                  |

Queue concurrency, job concurrency and node-wide `MaxParallelJobs` all apply. The effective
capacity is whichever limit is reached first.

<Callout type="note">

Cancellation is cooperative. The timeout and host shutdown cancel the token passed to
`HandleAsync`; code that ignores it may continue running, and its storage lease may be recovered
elsewhere.

</Callout>
