---
title: Installation
description: Add the Immediate.Skills marketplace to Claude Code or Codex, install plugins, and share them with a team.
order: 2
---

<script lang="ts">
	import { Callout, Tabs, TabItem } from '$lib/components/docs';
</script>

The repository is a plugin marketplace named `immediate`. Add it once, then install the plugins
for the libraries your project uses. Plugins are independent, so installing one never requires
another.

<Tabs items={['Claude Code', 'Codex']}>
<TabItem label="Claude Code">

Add the marketplace and install plugins from a terminal:

```bash
claude plugin marketplace add ImmediatePlatform/Immediate.Skills
claude plugin install immediate-handlers@immediate
claude plugin install immediate-apis@immediate
claude plugin install immediate-validations@immediate
claude plugin install immediate-cache@immediate
claude plugin install immediate-injections@immediate
claude plugin install immediate-jobs@immediate
claude plugin install immediate-platform@immediate
```

The same commands work inside a session as `/plugin marketplace add ...` and
`/plugin install ...`. Run `/plugin` to browse the marketplace and pick plugins interactively.

To update to the latest published skills:

```bash
claude plugin marketplace update immediate
```

</TabItem>
<TabItem label="Codex">

Add the marketplace and install plugins:

```bash
codex plugin marketplace add ImmediatePlatform/Immediate.Skills --ref main
codex plugin add immediate-handlers@immediate
codex plugin add immediate-apis@immediate
codex plugin add immediate-validations@immediate
codex plugin add immediate-cache@immediate
codex plugin add immediate-injections@immediate
codex plugin add immediate-jobs@immediate
codex plugin add immediate-platform@immediate
```

To update to the latest published skills, upgrade the marketplace and reinstall a plugin when
Codex asks for it:

```bash
codex plugin marketplace upgrade immediate
```

</TabItem>
</Tabs>

## Choose plugins

Install the plugin for each library in your project, plus `immediate-platform` when you want the
cross-library workflows (a complete vertical slice, multi-host registration, or diagnosing
generator and DI problems). For example, a web API that uses handlers, validation and endpoints
installs `immediate-handlers`, `immediate-validations`, `immediate-apis` and
`immediate-platform`.

## Share with a team in Claude Code

Commit the marketplace and the plugins to the project's `.claude/settings.json`. Claude Code offers
to install them when a teammate trusts the project folder:

```json title=".claude/settings.json"
{
	"extraKnownMarketplaces": {
		"immediate": {
			"source": {
				"source": "github",
				"repo": "ImmediatePlatform/Immediate.Skills"
			}
		}
	},
	"enabledPlugins": {
		"immediate-handlers@immediate": true,
		"immediate-apis@immediate": true,
		"immediate-validations@immediate": true,
		"immediate-platform@immediate": true
	}
}
```

## Check the installation

Ask the agent what it can do with a library, or invoke a skill directly:

```text
/immediate-handlers:create-handler add a GetOrders query that returns a user's orders
```

In Claude Code, `claude plugin details immediate-handlers@immediate` lists the skills in a plugin
and how much context they add to each session.

<Callout type="tip" title="Keep the libraries and skills in step">

The skills describe the current release of each library. Update the marketplace after upgrading an
Immediate package, so the agent uses the same APIs as your project.

</Callout>
