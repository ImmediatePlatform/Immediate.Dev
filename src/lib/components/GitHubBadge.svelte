<script lang="ts">
	import { cn } from '$lib/utils';
	import type { ClassValue } from 'clsx';

	let className: ClassValue;
	export { className as class };

	export let src: string;
	export let href: string;
	export let alt: string = '';
</script>

<a class={cn('mt-2 border-b-0', className)} {href} target="_blank">
	<img class="m-0" {src} {alt} />
</a>
