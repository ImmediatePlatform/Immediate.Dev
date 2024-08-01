<script lang="ts">
	import '../custom-page.css';

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
	import Typewriter from '$lib/components/Typewriter.svelte';

	import { apiSampleTabs, MasterExampleType, cliSampleTabs } from '$lib/code-examples';

	import TabbedCodeSample from '$lib/components/TabbedCodeSample.svelte';
	import MasterExampleTab from '$lib/components/MasterExampleTab.svelte';
	import BenchmarkChart from '$lib/components/BenchmarkChart.svelte';

	const typewriterStrings = [
		'Vertical Slice Architecture.',
		'Web Development.',
		'Mediator Pattern.',
		'Validation.'
	];

	let selectedMasterExample = MasterExampleType.WebApi;
</script>

<div class="w-full flex flex-col justify-between items-center py-20">
	<span
		class="text-left text-6xl md:text-5xl sm:flex sm:flex-col sm:text-center font-bold leading-tight tracking-wider sm:tracking-widest pb-4"
	>
		<span>Immediate</span><span class="sm:hidden"></span><span>Platform</span>
	</span>
	<div
		class="flex md:flex-col text-center text-4xl font-bold leading-tight tracking-tighter sm:text-2xl md:gap-y-2 sm:gap-y-0 pb-4"
	>
		<Typewriter strings={typewriterStrings} pauseFor={2500} delay={100} />
		<span class="text-brand text-center">Simplified.</span>
	</div>
	<p class="max-w-[760px] text-soft text-center text-lg sm:text-base text-balance pb-4">
		Libraries for building modern, maintainable .NET applications leveraging the Vertical Slice
		Architecture and Mediator pattern.<br />Extensible. Fast. Source Generated. Open Source.
	</p>

	<div class="flex gap-4">
		<Button primary type="raised">Get started</Button>
		<Button type="raised">
			<div class="flex gap-2">
				<Github />
				GitHub
			</div>
		</Button>
	</div>

	<div class="pt-36 sm:pt-24">
		<div
			class="flex sm:flex-col items-center justify-center gap-2 text-center text-3xl sm:text-2xl font-bold leading-tight tracking-tighter md:text-3xl pb-4"
		>
			<Blocks class="sm:h-12 sm:w-12" />
			<span>Easy to integrate into any app</span>
		</div>
		<p class="max-w-[760px] text-soft text-center text-lg sm:text-base text-balance pb-8">
			Thanks to their modular nature, ImmediatePlatform libraries can be easily integrated into most
			types of .NET applications.
		</p>
		<div class="md:w-screen md:px-4">
			<div class="flex overflow-auto items-end">
				<MasterExampleTab bind:selected={selectedMasterExample} type={MasterExampleType.WebApi}>
					<Server />
					Web API
				</MasterExampleTab>
				<MasterExampleTab bind:selected={selectedMasterExample} type={MasterExampleType.Cli}>
					<Console />
					CLI
				</MasterExampleTab>
				<MasterExampleTab bind:selected={selectedMasterExample} type={MasterExampleType.Blazor}>
					<Globe />
					Blazor
				</MasterExampleTab>
				<MasterExampleTab bind:selected={selectedMasterExample} type={MasterExampleType.DiscordBot}>
					<Bot />
					Discord Bot
				</MasterExampleTab>
			</div>

			{#if selectedMasterExample === MasterExampleType.WebApi}
				<TabbedCodeSample class="rounded-tl-none rounded-tr-md" tabs={apiSampleTabs} />
			{:else if selectedMasterExample === MasterExampleType.Cli}
				<TabbedCodeSample class="rounded-tl-none rounded-tr-md" tabs={cliSampleTabs} />
			{/if}

			<div
				class="flex gap-1 bg-background-lighter px-4 py-3 overflow-auto rounded-b-md text-sm sm:text-xs text-balance"
			>
				<span class="text-soft"> Like what you see? </span>
				<a class="underline" href="/">See our full cookbook.</a>
			</div>
		</div>
	</div>

	<div class="pt-36 sm:pt-24">
		<div
			class="flex sm:flex-col items-center justify-center gap-2 text-center text-3xl sm:text-2xl font-bold leading-tight tracking-tighter md:text-3xl pb-4"
		>
			<Rocket class="sm:h-12 sm:w-12" />
			<span>Blazingly fast</span>
		</div>

		<div class="flex justify-items-center items-center">
			<p class="max-w-[760px] text-soft text-center text-lg sm:text-base text-balance pb-8">
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
		class="flex sm:flex-col items-center justify-center gap-1 px-4 py-3 overflow-auto rounded-b-md text-sm sm:text-xs text-balance"
	>
		<p class="text-soft text-center">Single request/response handler benchmark.</p>
		<a class="underline" href="/">See full benchmark suite.</a>
	</div>
</div>
