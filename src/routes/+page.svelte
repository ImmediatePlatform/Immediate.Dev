<script lang="ts">
	import { Button } from '@svelteness/kit-docs';
	import {
		Blocks,
		Github,
		Server,
		Bot,
		SquareChevronRight as Console,
		Globe,
		Rocket
	} from 'lucide-svelte';
	import { apiSampleTabs, ExampleType, cliSampleTabs } from '$lib/code-examples';

	import Typewriter from '$lib/components/Typewriter.svelte';
	import TabbedCodeSample from '$lib/components/TabbedCodeSample.svelte';
	import ExampleSelectorTab from '$lib/components/ExampleSelectorTab.svelte';
	import BenchmarkChart from '$lib/components/BenchmarkChart.svelte';
	import ExampleSelector from '$lib/components/ExampleSelector.svelte';
	import { onMount } from 'svelte';

	const typewriterStrings = [
		'Vertical Slice Architecture.',
		'Web Development.',
		'Mediator Pattern.',
		'Validation.'
	];

	let selectedMasterExample = ExampleType.WebApi;

	onMount(() => {
		const onThisPage = document.getElementsByClassName('on-this-page')[0];
		onThisPage.remove();
	});
</script>

<svelte:head>
	<title>ImmediatePlatform</title>
</svelte:head>

<div class="flex w-full flex-col items-center justify-between py-20">
	<span
		class="pb-4 text-left text-6xl font-bold leading-tight tracking-wider md:text-5xl sm:flex sm:flex-col sm:text-center sm:tracking-widest"
	>
		<span>Immediate</span><span class="sm:hidden"></span><span>Platform</span>
	</span>
	<div
		class="flex pb-4 text-center text-4xl font-bold leading-tight tracking-tighter md:flex-col md:gap-y-2 sm:gap-y-0 sm:text-2xl"
	>
		<Typewriter strings={typewriterStrings} pauseFor={2500} delay={100} />
		<span class="text-center text-brand">Simplified.</span>
	</div>
	<p class="max-w-[760px] text-balance pb-4 text-center text-lg text-soft sm:text-base">
		Libraries for building modern, maintainable .NET applications leveraging the Vertical Slice
		Architecture and Mediator pattern with <span class="text-inverse underline">no boilerplate</span
		>.<br />Extensible. Fast. Source Generated. Open Source.
	</p>

	<div class="flex gap-4">
		<Button href="/docs/first-category/first-page" primary type="raised">Get started</Button>
		<Button type="raised">
			<div class="flex gap-2">
				<Github />
				GitHub
			</div>
		</Button>
	</div>

	<div class="pt-36 sm:pt-24">
		<div
			class="flex items-center justify-center gap-2 pb-4 text-center text-3xl font-bold leading-tight tracking-tighter md:text-3xl sm:flex-col sm:text-2xl"
		>
			<Blocks class="sm:h-12 sm:w-12" />
			<span>Easy to integrate into any app</span>
		</div>
		<p class="max-w-[760px] text-balance pb-8 text-center text-lg text-soft sm:text-base">
			Thanks to their modular nature, ImmediatePlatform libraries can be easily integrated into most
			types of .NET applications.
		</p>
		<div class="md:w-screen md:px-4">
			<ExampleSelector>
				<ExampleSelectorTab bind:selected={selectedMasterExample} type={ExampleType.WebApi}>
					<Server />
					Web API
				</ExampleSelectorTab>
				<ExampleSelectorTab bind:selected={selectedMasterExample} type={ExampleType.Cli}>
					<Console />
					CLI
				</ExampleSelectorTab>
				<ExampleSelectorTab bind:selected={selectedMasterExample} type={ExampleType.Blazor}>
					<Globe />
					Blazor
				</ExampleSelectorTab>
				<ExampleSelectorTab bind:selected={selectedMasterExample} type={ExampleType.DiscordBot}>
					<Bot />
					Discord Bot
				</ExampleSelectorTab>
			</ExampleSelector>

			{#if selectedMasterExample === ExampleType.WebApi}
				<TabbedCodeSample class="rounded-tl-none rounded-tr-md" tabs={apiSampleTabs} />
			{:else if selectedMasterExample === ExampleType.Cli}
				<TabbedCodeSample class="rounded-tl-none rounded-tr-md" tabs={cliSampleTabs} />
			{/if}

			<div
				class="flex gap-1 overflow-auto text-balance rounded-b-md bg-background-lighter px-4 py-3 text-sm sm:text-xs"
			>
				<span class="text-soft"> Like what you see? </span>
				<a class="underline" href="/">See our full cookbook.</a>
			</div>
		</div>
	</div>

	<div class="pt-36 sm:pt-24">
		<div
			class="flex items-center justify-center gap-2 pb-4 text-center text-3xl font-bold leading-tight tracking-tighter md:text-3xl sm:flex-col sm:text-2xl"
		>
			<Rocket class="sm:h-12 sm:w-12" />
			<span>Blazingly fast</span>
		</div>

		<div class="flex items-center justify-items-center">
			<p class="max-w-[760px] text-balance pb-8 text-center text-lg text-soft sm:text-base">
				ImmediatePlatform heavily leverages source generation and is extremely fast. Enjoy all the
				benefits of modern, industry-standard patterns, with none of the performance drawbacks that
				come with classic reflection-based solutions.
			</p>
		</div>
	</div>

	<div>
		<BenchmarkChart />
	</div>
	<div
		class="flex items-center justify-center gap-1 overflow-auto text-balance rounded-b-md px-4 py-3 text-sm sm:flex-col sm:text-xs"
	>
		<p class="text-center text-soft">Single request/response handler benchmark.</p>
		<a class="underline" href="/">See full benchmark suite.</a>
	</div>
</div>
