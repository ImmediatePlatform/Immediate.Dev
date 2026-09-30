---
title: Distributed .NET Aspire
description: Split Immediate.Jobs across an API, a CLI and a worker that share PostgreSQL storage.
order: 22
group: Samples
---

<script lang="ts">
	import { LinkCard } from '$lib/components/docs';
</script>

The distributed .NET Aspire sample runs Immediate.Jobs across separate processes that share one
PostgreSQL database through EF Core storage in distributed mode:

- the **API** applies migrations and hosts the Immediate.Jobs dashboard, Scalar, health checks and
  Aspire telemetry links. It calls `DisableWorkers()`, so it never executes jobs;
- the **CLI** prepares data and enqueues a batch that processes it. It also calls
  `DisableWorkers()` and exits once the batch is committed. Aspire starts it on demand;
- the **worker** is a plain host with the scheduler enabled. It runs the batch jobs concurrently
  with fair queues and a longer polling interval.

Use it as a starting point for deployments where web, tooling and background processing scale
separately.

<LinkCard
	title="View the distributed .NET Aspire sample on GitHub"
	description="Browse the AppHost, API, CLI, worker and shared job projects."
	href="https://github.com/ImmediatePlatform/Immediate.Jobs/tree/main/samples/DistributedAspire"
/>
