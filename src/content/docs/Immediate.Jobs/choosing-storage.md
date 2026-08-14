---
title: Choosing storage
description: Choose an Immediate.Jobs topology and provider by durability, scale and capability.
order: 10
group: Guides
---

Storage choice has two dimensions: the provider holds records; the topology decides whether memory
or that provider is authoritative.

| Topology       | Authority                               |   Processes | Durability               | Use for                                   |
| -------------- | --------------------------------------- | ----------: | ------------------------ | ----------------------------------------- |
| `InMemory`     | Process memory                          |         One | None                     | Unit tests, local demos, disposable work. |
| `SingleServer` | Memory with synchronous durable replica | Exactly one | Durable restart recovery | Low-latency single-instance services.     |
| `Distributed`  | Durable provider                        | One or more | Durable coordination     | Scale-out and high availability.          |

Calling a durable provider selects single-server mode unless you explicitly call
`UseDistributed()`. `UseRedis` always selects distributed mode. Never point two processes at the
same single-server replica: each believes its private memory is authoritative and drift detection
will fail.

## Capability matrix

| Provider     | Queue | Recurring | Graph | Fair groups | Topologies                 |
| ------------ | :---: | :-------: | :---: | :---------: | -------------------------- |
| In-memory    |   ✓   |     ✓     |   ✓   |      ✓      | In-memory only             |
| EF Core SQL  |   ✓   |     ✓     |   ✓   |      ✓      | Single-server, distributed |
| LinqToDB SQL |   ✓   |     ✓     |   ✓   |      ✓      | Single-server, distributed |
| Redis        |   ✓   |     ✓     |   —   |      —      | Distributed                |

Queue capability includes ordinary scheduling, execution history and job monitoring. Recurring
adds durable schedule reconciliation/materialization. Graph adds atomic batches, dependencies,
continuations and batch monitoring. The dashboard hides or returns 404 for unsupported graph
views.

## Tradeoffs

- In-memory is fastest and deterministic, but a restart loses pending jobs and history.
- Single-server acquires from memory and writes every transition to a full-capability SQL replica.
  Startup restores the durable snapshot. It cannot provide multi-process failover.
- Distributed SQL coordinates leases, recurring schedules, graph transitions and fair-group
  cursors in the database and is the full-featured scale-out option.
- Redis offers efficient distributed queues and recurring work, but not batches, continuations or
  fair-group acquisition.

## A custom provider

Implement `IJobStorage` for queue capability. Add `IRecurringJobStorage`, `IJobGraphStorage`, and
`IFairQueueStorage` only when the provider supports each feature.

Single-server storage needs two extra interfaces for restart recovery. `IJobStorageReplica`
acquires the exact job IDs selected by the in-memory queue. `IJobGraphStorageReplica` reads
incoming continuation edges at startup. A durable provider must implement both interfaces, plus
recurring and graph support, to run in single-server mode. `InMemoryJobStorage` implements neither
replica interface.

Initialization and disposal must be safe to repeat. Claims, recurring occurrences, and graph
changes must be atomic so concurrent workers cannot create duplicates or overwrite each other.
Providers must also enforce leases and worker ownership, and page monitoring results.

Run the `JobStorageConformanceSuite` from `Immediate.Jobs.Testing` through the provider's public DI
registration. Select the tests that match its capability flags. See
[Testing jobs](/docs/Immediate.Jobs/testing-jobs#test-a-storage-provider) and the compact contract
map in [API reference](/docs/Immediate.Jobs/api-reference#custom-storage-contracts).
