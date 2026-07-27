---
title: CLI App
description: CLI App cookbook example
order: 5
---

<script lang="ts">
	import { LinkCard } from '$lib/components/docs';
</script>

This example is hosted on GitHub and demonstrates an example command line application for generating random numbers that makes use of ImmediatePlatform libraries.

<LinkCard title="View example on GitHub" href="https://github.com/ImmediatePlatform/Immediate.Dev/tree/main/cookbook/CliExample" />

## Stack

The example uses the following stack:

- Microsoft.Extensions.DependencyInjection
- CliFx*
- Immediate.Handlers + Immediate.Apis + Immediate.Validations

* - `CliFx` can be easily replaced with BCL or another CLI library (e.g. `System.CommandLine`.)
