---
title: Native AOT
description: Run Immediate.Jobs in a Native AOT console application.
order: 20
group: Samples
---

<script lang="ts">
	import { LinkCard } from '$lib/components/docs';
</script>

The Native AOT sample demonstrates publishing Immediate.Jobs with ahead-of-time compilation. It
uses in-memory storage, schedules a job through its generated scheduler, captures and restores a
custom job context, and drains the scheduler before the application exits.

<LinkCard
	title="View the Native AOT sample on GitHub"
	description="Browse the complete Immediate.Jobs Native AOT sample source."
	href="https://github.com/ImmediatePlatform/Immediate.Jobs/tree/master/samples/NativeAot"
/>
