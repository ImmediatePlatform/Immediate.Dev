<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import BotIcon from '@lucide/svelte/icons/bot';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	let {
		title = 'Migrate with an AI agent',
		description = 'Copy this prompt into Claude Code, Codex, Copilot or another coding agent from the root of your repository.',
		children
	}: {
		title?: string;
		description?: string;
		children: Snippet;
	} = $props();

	let body: HTMLElement | undefined = $state();
	let expanded = $state(false);
	let status: 'idle' | 'copied' | 'error' = $state('idle');
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	// The prompt is authored as a fenced code block; copy the code text, not the rendered chrome.
	function promptText(): string {
		const code = body?.querySelector('code');
		return (code?.textContent ?? body?.textContent ?? '').trim();
	}

	async function copyPrompt() {
		try {
			await navigator.clipboard.writeText(promptText());
			status = 'copied';
		} catch {
			status = 'error';
		}

		clearTimeout(resetTimer);
		resetTimer = setTimeout(() => {
			status = 'idle';
		}, 2000);
	}

	onDestroy(() => clearTimeout(resetTimer));
</script>

<div class="not-prose border-primary/30 bg-primary/5 my-6 rounded-xl border">
	<div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex min-w-0 gap-3">
			<BotIcon class="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
			<div class="min-w-0">
				<p class="text-foreground font-semibold">{title}</p>
				<p class="text-muted-foreground mt-1 text-sm">{description}</p>
			</div>
		</div>
		<div class="flex shrink-0 gap-2">
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (expanded = !expanded)}
				aria-expanded={expanded}
			>
				<ChevronDownIcon class="transition-transform {expanded ? 'rotate-180' : ''}" />
				{expanded ? 'Hide prompt' : 'Show prompt'}
			</Button>
			<Button size="sm" onclick={copyPrompt} aria-live="polite">
				{#if status === 'copied'}
					<CheckIcon />
					Copied
				{:else if status === 'error'}
					<TriangleAlertIcon />
					Copy failed
				{:else}
					<CopyIcon />
					Copy prompt
				{/if}
			</Button>
		</div>
	</div>
	<div
		bind:this={body}
		class="agent-prompt-body border-primary/20 border-t px-4 pb-1"
		hidden={!expanded}
	>
		{@render children()}
	</div>
</div>

<style>
	.agent-prompt-body :global(pre) {
		max-height: 28rem;
		overflow: auto;
		white-space: pre-wrap;
	}
</style>
