<script lang="ts">
	import type { Tab } from '$lib/code-examples';
	import type { ClassValue } from 'clsx';

	import { fade } from 'svelte/transition';
	import { Copy } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	import CodeSample from './CodeSample.svelte';

	let className: ClassValue | undefined = undefined;
	let activeTabIndex = 0;
	let copied = false;
	let timer: number;

	export let tabs: Tab[];
	export { className as class };

	const switchTab = (newIndex: number) => {
		activeTabIndex = newIndex;
	};

	const onCopyClick = () => {
		navigator.clipboard.writeText(tabs[activeTabIndex].content);
		copied = true;

		clearTimeout(timer);

		timer = setTimeout(() => {
			copied = false;
		}, 2000);
	};
</script>

<div class={cn('flex gap-1 bg-background-lighter px-2 pt-2 overflow-auto rounded-t-md', className)}>
	{#each tabs as tab, i}
		<button
			class={cn(
				'flex-none items-center justify-center gap-0.5 text-sm px-4 py-2 rounded-t-md overflow-hidden hover:bg-background-lightest',
				{
					'font-semibold border-b-4 border-b-brand hover:bg-background-lighter':
						i === activeTabIndex
				}
			)}
			on:click={() => switchTab(i)}
		>
			<span class="select-none">{tab.title}</span>
		</button>
	{/each}

	<div class="sm:hidden flex-none items-center ml-auto my-auto mr-2 text-soft hover:text-white">
		{#if copied}
			<div
				class="flex py-1 px-3 bg-brand font-mono text-black text-xs rounded"
				in:fade={{ duration: 400 }}
			>
				<span class="text-center select-none">Copied!</span>
			</div>
		{:else}
			<button on:click={onCopyClick} in:fade={{ duration: 400 }}>
				<Copy class="h-5" />
			</button>
		{/if}
	</div>
</div>
<CodeSample code={tabs[activeTabIndex].content} />
