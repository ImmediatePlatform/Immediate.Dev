<script lang="ts">
	import './layout.css';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href="/favicon.png" /></svelte:head>
<Toaster />
<ModeWatcher />
{@render children()}
