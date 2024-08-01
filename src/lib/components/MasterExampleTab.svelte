<script lang="ts">
	import type { MasterExample } from '$lib/code-examples';

	export let type: MasterExample;
	export let selected: MasterExample;

	const activeClasses =
		'flex-none bg-[#080b0f] justify-center gap-0.5 font-semibold text-md px-8 py-4 border-border rounded-t-md overflow-hidden';

	const inactiveClasses =
		'flex-none justify-center gap-0.5 font-semibold text-md px-8 py-3 overflow-hidden hover:bg-[#0d1117] rounded-t-md';
</script>

<button
	class={type === selected ? activeClasses : inactiveClasses}
	on:click={() => (selected = type)}
>
	<div class="flex gap-2 select-none">
		<slot></slot>
	</div>
</button>
