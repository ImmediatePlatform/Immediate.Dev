<script lang="ts">
	import type { MasterExampleType } from '$lib/code-examples';
	import type { ClassValue } from 'clsx';
	import { cn } from '$lib/utils';

	let className: ClassValue | undefined = undefined;

	export let type: MasterExampleType;
	export let selected: MasterExampleType;
	export { className as class };
</script>

<button
	class={cn(
		'flex-none justify-center gap-0.5 font-semibold text-md px-8 py-3 overflow-hidden hover:bg-background-lightest rounded-t-md',
		{
			'bg-background-lighter py-4 border-border rounded-t-md': selected === type
		},
		className
	)}
	on:click={() => (selected = type)}
>
	<div class="flex gap-2 select-none">
		<slot></slot>
	</div>
</button>
