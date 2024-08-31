<script lang="ts">
	import { ExampleType, type CodeExample } from '$lib/types';

	import { Button } from '@svelteness/kit-docs';
	import { Blocks, Github, Rocket } from 'lucide-svelte';
	import apiExample from '$lib/code-examples/api';
	import cliExample from '$lib/code-examples/cli';
	import blazorExample from '$lib/code-examples/blazor';
	import botExample from '$lib/code-examples/bot';

	import Typewriter from '$lib/components/Typewriter.svelte';
	import TabbedCodeSample from '$lib/components/TabbedCodeSample.svelte';
	import ExampleSelectorTab from '$lib/components/ExampleSelectorTab.svelte';
	import BenchmarkChart from '$lib/components/BenchmarkChart.svelte';
	import ExampleSelector from '$lib/components/ExampleSelector.svelte';

	const typewriterStrings = [
		'Vertical Slice Architecture.',
		'Web Development.',
		'Mediator Pattern.',
		'CQRS.',
		'Validation.'
	];

	let selectedMasterExample = ExampleType.WebApi;

	const examples = new Map<ExampleType, CodeExample>([
		[ExampleType.WebApi, apiExample],
		[ExampleType.Cli, cliExample],
		[ExampleType.Blazor, blazorExample],
		[ExampleType.DiscordBot, botExample]
	]);

	$: exampleContents = examples.get(selectedMasterExample)?.contents;
</script>

<svelte:head>
	<title>ImmediatePlatform</title>
</svelte:head>

<div class="flex w-full flex-col items-center justify-between py-20">
	<div
		class="flex pb-4 text-center text-4xl font-bold leading-tight tracking-tighter md:flex-col md:gap-y-2 sm:gap-y-0 sm:text-2xl"
	>
		<Typewriter strings={typewriterStrings} pauseFor={2500} delay={100} />
		<span
			class="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-center text-transparent"
			>Simplified.</span
		>
	</div>
	<p class="max-w-[760px] text-balance pb-4 text-center text-lg text-soft sm:text-base">
		Libraries for building modern, maintainable .NET applications leveraging the Vertical Slice
		Architecture and Mediator pattern with <span class="text-inverse underline">no boilerplate</span
		>.<br />Extensible. Fast. Source Generated. Open Source.
	</p>

	<div class="flex gap-4">
		<Button href="/docs/getting-started/introduction" primary type="raised">Get started</Button>
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
				{#each examples as example}
					<ExampleSelectorTab bind:selected={selectedMasterExample} type={example[1].type}>
						<svelte:component this={example[1].icon} class="h-6 sm:h-5" />
						<span class="sm:hidden">{example[1].label}</span>
					</ExampleSelectorTab>
				{/each}
			</ExampleSelector>

			{#if exampleContents}
				<TabbedCodeSample
					class="rounded-tl-none rounded-tr-md sm:rounded-tr-none"
					tabs={exampleContents}
				/>
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

	<div class="flex w-full justify-center">
		<BenchmarkChart />
	</div>
	<div
		class="flex items-center justify-center gap-1 overflow-auto text-balance rounded-b-md px-4 py-3 text-sm sm:flex-col sm:text-xs"
	>
		<p class="text-center text-soft">Single request/response handler benchmark.</p>
		<a class="underline" href="/">See full benchmark suite.</a>
	</div>
</div>

<style>
	:global(.on-this-page) {
		@apply hidden;
	}
</style>
