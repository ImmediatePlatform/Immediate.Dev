---
title: Contributing
description: Add or update an Immediate.Skills skill, keep both plugin manifests in sync, and validate the marketplace.
order: 4
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Skills live in the [Immediate.Skills repository](https://github.com/ImmediatePlatform/Immediate.Skills).
They describe how to **use** the Immediate libraries in an application. Guidance for maintaining a
library itself (releases, analyzers, generators, build matrices) stays in that library's
repository.

## Repository layout

```text
.agents/plugins/marketplace.json      # Codex marketplace
.claude-plugin/marketplace.json       # Claude Code marketplace
plugins/
  immediate-jobs/
    .codex-plugin/plugin.json
    .claude-plugin/plugin.json
    skills/
      create-job/
        SKILL.md                      # workflow, loaded when the skill is used
        agents/openai.yaml            # display name and default prompt
        references/job-contract.md    # details loaded only when needed
scripts/validate.py
tests/activation-prompts.json
```

Each plugin has a Codex manifest and a Claude Code manifest with the same name, version,
description, author, links, license and keywords. The Claude Code marketplace lists the same
installable plugins as the Codex marketplace, in the same order.

## Add a skill

1. Pick the plugin for the library the task belongs to. Use `immediate-platform` only for work that
   spans several libraries.
2. Create `plugins/<plugin>/skills/<skill-name>/SKILL.md` with a lowercase, hyphenated, action
   name such as `create-endpoint`. Its frontmatter has only `name` and `description`. Write the
   description so an agent can tell when the skill applies.
3. Keep `SKILL.md` short: a workflow, guardrails and what to report back. Put longer material in
   `references/` and list the Immediate.Dev pages it came from, one per line, in the form
   ``Immediate.Dev: `Immediate.Jobs/recurring-jobs.md` ``.
4. Add `agents/openai.yaml` with a display name, a 25 to 64 character short description and a
   default prompt that names the skill.
5. Add direct, indirect, incomplete, negative and edge prompts for the skill to
   `tests/activation-prompts.json`, and try a realistic change with a fresh agent.
6. Run the validators.

## Publish a change

1. Bump the plugin's version in **both** `.codex-plugin/plugin.json` and
   `.claude-plugin/plugin.json`.
2. When a new plugin becomes available, set its Codex marketplace entry to `AVAILABLE` and add it to
   `.claude-plugin/marketplace.json` in the same change.
3. Validate, open a pull request, and tag the release when consumers should be able to pin it.

## Validate

```bash
python3 scripts/validate.py
claude plugin validate --strict .
```

`validate.py` runs in CI. It checks skill metadata, manifests, marketplace entries, activation
prompts and the Immediate.Dev source links. It fails when the Claude Code manifests drift from the
Codex manifests. `claude plugin validate` additionally checks the marketplace and each plugin
against Claude Code's schema.

<Callout type="note" title="Update skills with the docs">

When a library change updates these docs, update the matching skills in the same release. Search
the skills for renamed or removed APIs, and keep each reference's Immediate.Dev source list
accurate.

</Callout>
