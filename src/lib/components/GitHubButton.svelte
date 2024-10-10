<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@svelteness/kit-docs';
	import { Github } from 'lucide-svelte';

	export let text: string = 'GitHub';
	export let link: string = 'https://github.com/ImmediatePlatform';
</script>

<Button type="raised" href={link} target="_blank">
	<div class="flex gap-2">
		<Github />
		{text}
	</div>
</Button>
