---
title: Queues and fairness
description: Define queues, limit concurrency, set priority and share capacity across groups.
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
builder.Services.AddMyAppJobs()
	.UseFairQueues(options => options.Configure(fair =>
	{
		fair.ConcurrencyShareThreshold = 0.10;
		fair.MinInflightForNoisy = 30;
		fair.GroupRoundRobin = true;
	}))
	.ConfigureStorage(storage => storage.UseInMemory());

await welcomeEmail.EnqueueAsync(
	new(userId, "v2"),
	groupId: tenantId,
	cancellationToken: cancellationToken
);
```

The `OptionsBuilder<FairQueueOptions>` callback can also bind an `IConfiguration` section:

```csharp
builder.Services.AddMyAppJobs()
	.UseFairQueues(options => options.Bind(
		builder.Configuration.GetSection("ImmediateJobs:FairQueues")))
	.ConfigureStorage(storage => storage.UseInMemory());
```

Round-robin alternates between groups that have work ready. A group becomes noisy after it reaches
`MinInflightForNoisy` active jobs and uses more than `ConcurrencyShareThreshold` of the queue's
capacity. Jobs then favors quieter groups. Jobs without a group remain eligible. Fairness changes
which ready job runs next; it does not change priority or retry rules.

| Storage and mode   | Fair groups                                                     |
| ------------------ | --------------------------------------------------------------- |
| In-memory          | Supported                                                       |
| EF Core / LinqToDB | Supported                                                       |
| Redis              | Not supported; enabling fair queues causes an error             |
| Single-server      | Supported when its durable provider meets the mode requirements |

Queue and group names are persisted. Renaming either does not rename already-persisted work.
