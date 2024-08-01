<script lang="ts">
	import type { Tab } from '$lib/types';

	import { fade } from 'svelte/transition';
	import { Copy } from 'lucide-svelte';
	import CodeSample from './CodeSample.svelte';

	let activeTabIndex = 0;
	let copied = false;
	let timer: number;

	export let tabs: Tab[];
	export let borderTop: boolean = true;

	const defaultContainerClasses = 'flex gap-1 bg-[#080b0f] px-2 pt-2 overflow-auto rounded-tr-md';
	const containerClasses = borderTop
		? defaultContainerClasses + ' rounded-t-md'
		: defaultContainerClasses;

	const activeClasses =
		'flex-none items-center justify-center gap-0.5 font-semibold text-sm px-4 py-2 border-b-4 border-b-brand rounded-t-md overflow-hidden';
	const inactiveClasses =
		'flex-none items-center justify-center gap-0.5 text-sm px-4 py-2 rounded-t-md overflow-hidden hover:bg-[#0d1117]';

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

<div class={containerClasses}>
	{#each tabs as tab, i}
		<button
			class={i === activeTabIndex ? activeClasses : inactiveClasses}
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
