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

Implement `IJobStorage` for queue capability. Add `IRecurringJobStorage` and/or `IJobGraphStorage`
only when their atomicity contracts are honored. Implement `IJobStorageReplica` as well to qualify
for single-server mode. Providers must initialize idempotently, claim due work atomically, enforce
worker ownership and leases, make recurring materialization unique, paginate monitoring, tolerate
repeated async disposal, and make graph commit/release/cascade transitions atomic. See the compact
contract map in [API reference](/docs/Immediate.Jobs/api-reference#custom-storage-contracts).
