<script lang="ts">
	import { cn } from '$lib/utils';
	import type { ClassValue } from 'clsx';

	let className: ClassValue | undefined = undefined;

	export { className as class };
</script>

<img src="blazor.png" class={cn('brightness-0 invert filter', className)} alt="Blazor logo" />
