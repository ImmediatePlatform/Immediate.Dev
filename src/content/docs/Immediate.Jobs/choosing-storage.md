---
title: Choosing storage
description: Choose storage by durability, worker count and supported job features.
order: 10
group: Guides
---

Choose both a storage provider and a mode. The provider stores job data. The mode controls whether
workers coordinate through memory or through the provider.

| Mode           | Where jobs are coordinated       | Worker processes | Survives restart | Use for                                   |
| -------------- | -------------------------------- | ---------------- | ---------------- | ----------------------------------------- |
| `InMemory`     | Current process                  | One              | No               | Unit tests, local demos, disposable work. |
| `SingleServer` | Memory backed by durable storage | Exactly one      | Yes              | Low-latency single-instance services.     |
| `Distributed`  | Storage provider                 | One or more      | Yes              | Scale-out and high availability.          |

A durable SQL provider uses single-server mode unless you call `UseDistributed()`. Redis always
uses distributed mode. Do not connect two scheduler processes to the same single-server storage;
the mode expects exactly one process and fails when it detects another.

## Supported features

| Provider     | Queue | Recurring | Graph | Fair groups | Modes                      |
| ------------ | :---: | :-------: | :---: | :---------: | -------------------------- |
| In-memory    |   ✓   |     ✓     |   ✓   |      ✓      | In-memory only             |
| EF Core SQL  |   ✓   |     ✓     |   ✓   |      ✓      | Single-server, distributed |
| LinqToDB SQL |   ✓   |     ✓     |   ✓   |      ✓      | Single-server, distributed |
| Redis        |   ✓   |     ✓     |   —   |      —      | Distributed                |

Queue support includes scheduling, execution history and job monitoring. Recurring support stores
schedules and creates runs when they are due. Graph support adds batches, dependencies,
continuations and batch monitoring. The dashboard hides graph views when storage does not support
them.

## Tradeoffs

- In-memory is fastest and deterministic, but a restart loses pending jobs and history.
- Single-server selects work in memory and writes every change to SQL. It restores that state after
  a restart but cannot fail over to another process.
- Distributed SQL coordinates workers through the database. It supports multiple processes and
  all job features.
- Redis offers efficient distributed queues and recurring work, but not batches, continuations or
  fair queues.

## A custom provider

Implement `IJobStorage` to support queues. Add `IRecurringJobStorage`, `IJobGraphStorage`, and
`IFairQueueStorage` only for features the provider supports.

Single-server storage needs two extra interfaces for restart recovery. `IJobStorageReplica`
claims the exact job IDs selected by the in-memory queue. `IJobGraphStorageReplica` loads incoming
continuation links at startup. A provider must implement both interfaces, plus recurring and graph
support, to use single-server mode.

Starting or disposing the provider more than once must be safe. It must save claims, recurring
runs and graph changes as single operations so workers cannot create duplicates or overwrite each
other. It must also enforce leases and worker ownership, and return monitoring results in pages.

Run the `JobStorageConformanceSuite` from `Immediate.Jobs.Testing` with the same service
registration an application would use. Select the tests that match the provider's features. See
[Testing jobs](/docs/Immediate.Jobs/testing-jobs#test-a-storage-provider) and the contract summary
in [API reference](/docs/Immediate.Jobs/api-reference#custom-storage-contracts).
