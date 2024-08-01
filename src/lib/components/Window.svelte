<script lang="ts">
	import { cn } from '$lib/utils';
	import type { ClassValue } from 'clsx';

	let className: ClassValue | undefined = undefined;

	export let title: string = '';
	export { className as class };
</script>

<div>
	<div class={cn('flex-none border border-border bg-[#3f4044] rounded-t-md', className)}>
		<div class="flex items-center justify-center h-8 space-x-1.5 px-3">
			<div class="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
			<div class="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
			<div class="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
			<div class="flex w-full pr-[1.875rem] justify-center items-center">
				<span class="text-center">{title}</span>
			</div>
		</div>
	</div>
	<slot />
</div>
