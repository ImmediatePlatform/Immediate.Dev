<script lang="ts">
	import { cn } from '$lib/utils';
	import type { ClassValue } from 'clsx';

	let className: ClassValue;
	export { className as class };
</script>

<div class={cn('flex items-center gap-2', className)}>
	<slot></slot>
</div>
