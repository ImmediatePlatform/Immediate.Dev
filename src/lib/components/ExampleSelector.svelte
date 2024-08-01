<script lang="ts">
	import { cn } from '$lib/utils';
	import type { ClassValue } from 'clsx';

	let className: ClassValue | undefined = undefined;

	export { className as class };
</script>

<div class={cn('flex overflow-auto items-end', className)}>
	<slot></slot>
</div>
