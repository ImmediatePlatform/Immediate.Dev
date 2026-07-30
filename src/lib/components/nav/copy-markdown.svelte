<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import { onDestroy } from 'svelte';

	let { markdown }: { markdown: string } = $props();

	let status: 'idle' | 'copied' | 'error' = $state('idle');
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	async function copyMarkdown() {
		try {
			await navigator.clipboard.writeText(markdown);
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

<Button
	variant="outline"
	size="sm"
	class="shrink-0 self-start sm:mt-0.5"
	onclick={copyMarkdown}
	aria-label="Copy page as Markdown"
	aria-live="polite"
>
	{#if status === 'copied'}
		<CheckIcon />
		Copied
	{:else if status === 'error'}
		<TriangleAlertIcon />
		Copy failed
	{:else}
		<CopyIcon />
		Copy Markdown
	{/if}
</Button>
