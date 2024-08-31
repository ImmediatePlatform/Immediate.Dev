<script lang="ts">
	import type { ExampleType } from '$lib/types';
	import type { ClassValue } from 'clsx';
	import { cn } from '$lib/utils';

	let className: ClassValue | undefined = undefined;

	export let type: ExampleType;
	export let selected: ExampleType;
	export { className as class };
</script>

<button
	class={cn(
		'text-md flex-none justify-center gap-0.5 overflow-hidden rounded-t-md px-8 py-3 font-semibold hover:bg-background-lightest sm:px-6',
		{
			'rounded-t-md border-border bg-background-lighter py-4': selected === type
		},
		className
	)}
	on:click={() => (selected = type)}
>
	<div class="flex select-none gap-2">
		<slot></slot>
	</div>
</button>
