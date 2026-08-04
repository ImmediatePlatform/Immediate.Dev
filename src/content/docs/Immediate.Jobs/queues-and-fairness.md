---
title: Queues and fairness
description: Define queues and combine priority, concurrency and fair-group scheduling.
order: 6
group: Guides
---

Define a marker type and assign jobs to it:

```csharp
[QueueDefinition(Name = "transactional-email", Priority = 100, Concurrency = 2)]
public sealed class TransactionalEmailQueue;

[Handler, Job, UsesQueue<TransactionalEmailQueue>]
public sealed partial class SendWelcomeEmail(IEmailSender sender)
{
	// HandleAsync omitted
}
```

Without `[UsesQueue<T>]`, a job uses the built-in `default` queue (`Priority = 0`,
`Concurrency = 0`). A custom persisted name defaults to the class name with a `Queue` suffix
converted to kebab case (`TransactionalEmailQueue` becomes `transactional-email-queue`). Set
`Name` explicitly for production. Names must be unique, must not be `default`, and queue
concurrency cannot be negative.

Higher `Priority` queues are considered first. `Concurrency` limits in-flight work for that queue
on one scheduler node; zero is unbounded. Node-wide `MaxParallelJobs` and job-level
`MaxConcurrency` still apply, so priority never bypasses capacity.

## Fair groups

Enable fairness globally and put a tenant/customer key on each scheduled invocation:

```csharp
builder.Services.AddMyAppJobs(options =>
{
	options.UseFairQueues(fair =>
	{
		fair.ConcurrencyShareThreshold = 0.10;
		fair.MinInflightForNoisy = 30;
		fair.GroupRoundRobin = true;
	});
});

await welcomeEmail.EnqueueAsync(
	new(userId, "v2"),
	groupId: tenantId,
	cancellationToken: cancellationToken
);
```

Round-robin interleaves due groups. A group becomes noisy only after it has at least
`MinInflightForNoisy` active jobs and exceeds `ConcurrencyShareThreshold` of the queue's effective
capacity; quieter groups are then preferred. Ungrouped jobs remain eligible. Fairness affects
acquisition order, not durable priority or a job's retry policy.

| Provider/topology     | Fair groups                                                      |
| --------------------- | ---------------------------------------------------------------- |
| In-memory             | Supported                                                        |
| EF Core / LinqToDB    | Supported                                                        |
| Redis                 | Not supported; grouped acquisition is rejected                   |
| Single-server wrapper | Supported when its durable replica has full graph/fair semantics |

Queue and group names are persisted. Renaming either does not rename already-persisted work.
