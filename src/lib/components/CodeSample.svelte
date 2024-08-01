<script lang="ts">
	import Highlight from 'svelte-highlight';
	import csharp from 'svelte-highlight/languages/csharp';
	import theme from 'svelte-highlight/styles/github-dark';

	export let code: string;
</script>

<svelte:head>
	{@html theme}
</svelte:head>

<Highlight language={csharp} {code} />
