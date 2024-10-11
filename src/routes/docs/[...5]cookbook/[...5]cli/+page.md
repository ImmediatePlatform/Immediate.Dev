---
title: CLI App
---

# {$frontmatter.title}

<script>
    import GitHubButton from '$lib/components/GitHubButton.svelte';
</script>

This example is hosted on GitHub and demonstrates an example command line application for generating random numbers that makes use of ImmediatePlatform libraries.

<GitHubButton link="https://github.com/ImmediatePlatform/Immediate.Dev/tree/main/cookbook/CliExample" text="View example on GitHub" />

## Stack

The example uses the following stack:

- Microsoft.Extensions.DependencyInjection
- CliFx*
- Immediate.Handlers + Immediate.Apis + Immediate.Validations

* - `CliFx` can be easily replaced with BCL or another CLI library (e.g. `System.CommandLine`.)