<script lang="ts">
    import { ExampleType, type CodeExample } from '$lib/types';

    import { Button } from '@svelteness/kit-docs';
    import { Blocks, Rocket, ShieldCheck } from 'lucide-svelte';
    import apiExample from '$lib/code-examples/api/example';
    import cliExample from '$lib/code-examples/cli/example';
    import blazorExample from '$lib/code-examples/blazor/example';

    import Typewriter from '$lib/components/Typewriter.svelte';
    import TabbedCodeSample from '$lib/components/TabbedCodeSample.svelte';
    import ExampleSelectorTab from '$lib/components/ExampleSelectorTab.svelte';
    import BenchmarkChart from '$lib/components/BenchmarkChart.svelte';
    import ExampleSelector from '$lib/components/ExampleSelector.svelte';
    import { scrollIntoView } from '$lib/utils';
    import Window from '$lib/components/Window.svelte';

    import TypeSafetyExampleScreenshot from '$img/compile-time.png';
    import TypeSafetyExampleScreenshotSmall from '$img/compile-time-sm.png';
    import Footer from '$lib/components/Footer.svelte';
    import GitHubButton from '$lib/components/GitHubButton.svelte';
    import { oneBehaviorOneServiceData } from '$lib/benchmark-data';

    const typewriterStrings = [
        'Vertical Slice Architecture.',
        'Web Development.',
        'Mediator Pattern.',
        'CQRS.',
        'Validation.',
        'Caching.'
    ];

    const examples = new Map<ExampleType, CodeExample>([
        [ExampleType.WebApi, apiExample],
        [ExampleType.Cli, cliExample],
        [ExampleType.Blazor, blazorExample]
    ]);

    let examplesDiv: HTMLDivElement;
    let selectedMasterExample = ExampleType.WebApi;

    $: exampleContents = examples.get(selectedMasterExample)?.contents;
</script>

<svelte:head>
    <title>ImmediatePlatform</title>
</svelte:head>

<div id="home-page" class="flex w-full flex-col items-center justify-between py-36 sm:py-24">
    <div
        class="flex pb-4 text-center text-4xl font-bold leading-tight tracking-tighter md:flex-col md:gap-y-2 sm:gap-y-0 sm:text-2xl"
    >
        <Typewriter strings={typewriterStrings} pauseFor={2500} delay={100} />
        <span
            class="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-center text-transparent"
            >Simplified.</span
        >
    </div>
    <p class="max-w-[50rem] text-balance pb-4 text-center text-lg text-soft sm:text-base">
        Libraries for building modern, maintainable .NET applications leveraging the Vertical Slice
        Architecture and Mediator pattern with <button
            class="select-text text-inverse underline"
            on:click={() => scrollIntoView(examplesDiv)}>no boilerplate</button
        >.<br />Extensible. Fast. Source Generated. Open Source.
    </p>

    <div class="flex gap-4">
        <Button href="/docs/getting-started/introduction" primary type="raised">Get started</Button>
        <GitHubButton />
    </div>

    <div bind:this={examplesDiv} class="mt-36 sm:mt-24">
        <div
            class="flex items-center justify-center gap-2 pb-4 text-center text-3xl font-bold leading-tight tracking-tighter md:text-3xl sm:flex-col sm:text-2xl"
        >
            <Blocks class="sm:h-12 sm:w-12" />
            <span>Easy to integrate into any app</span>
        </div>
        <p class="max-w-[50rem] text-balance pb-8 text-center text-lg text-soft sm:text-base">
            Thanks to their modular nature, ImmediatePlatform libraries can be easily integrated
            into most types of .NET applications.
        </p>
        <div class="lg:px-4 md:w-screen">
            <ExampleSelector>
                {#each examples as example}
                    <ExampleSelectorTab
                        bind:selected={selectedMasterExample}
                        type={example[1].type}
                    >
                        <svelte:component this={example[1].icon} class="h-6 sm:h-5" />
                        <span class="sm:hidden">{example[1].label}</span>
                    </ExampleSelectorTab>
                {/each}
            </ExampleSelector>

            {#if exampleContents}
                <TabbedCodeSample
                    class={[
                        'border border-border dark:rounded-tr-md dark:border-0',
                        { 'rounded-tl-none': selectedMasterExample === 0 }
                    ]}
                    codeSampleClass="rounded-t-none rounded-b-none border-t-0 [&_code]:max-h-[28rem] [&_code]:min-h-[28rem] sm:[&_code]:max-h-[22.5rem] sm:[&_code]:min-h-[22.5rem]"
                    tabs={exampleContents}
                />
            {/if}

            <div
                class="flex gap-1 overflow-auto text-balance rounded-b-md border border-t-0 border-border bg-background-lighter px-4 py-3 text-sm dark:border-0 sm:text-xs"
            >
                <span class="text-soft"> Like what you see? </span>
                <a class="underline" href="/docs/cookbook/the-cookbook">See our full cookbook.</a>
            </div>
        </div>
    </div>

    <div class="mt-36 sm:mt-24">
        <div
            class="flex items-center justify-center gap-2 pb-4 text-center text-3xl font-bold leading-tight tracking-tighter md:text-3xl sm:flex-col sm:text-2xl"
        >
            <Rocket class="sm:h-12 sm:w-12" />
            <span>Blazingly fast</span>
        </div>

        <div class="flex items-center justify-items-center">
            <p class="max-w-[50rem] text-balance pb-8 text-center text-lg text-soft sm:text-base">
                ImmediatePlatform heavily leverages source generation and is extremely fast. Enjoy
                all the benefits of modern, industry-standard patterns, with none of the performance
                drawbacks that come with classic reflection-based solutions.
            </p>
        </div>

        <div class="flex w-full justify-center">
            <BenchmarkChart
                data={oneBehaviorOneServiceData}
                class="h-[300px] w-[500px] p-4 md:w-[250px] sm:w-[200px]"
            />
        </div>
        <div
            class="flex items-center justify-center gap-1 overflow-auto text-balance rounded-b-md px-4 py-3 text-sm sm:flex-col sm:text-xs"
        >
            <p class="text-center text-soft">Benchmark using 1 behavior and 1 service.</p>
            <a class="underline" href="/docs/benchmarks/performance-comparisons"
                >See full benchmark suite.</a
            >
        </div>
    </div>

    <div class="mt-36 sm:mt-24">
        <div
            class="flex items-center justify-center gap-2 pb-4 text-center text-3xl font-bold leading-tight tracking-tighter md:text-3xl sm:flex-col sm:text-2xl"
        >
            <ShieldCheck class="sm:h-12 sm:w-12" />
            <span>Compile-time safe</span>
        </div>

        <div class="flex items-center justify-items-center">
            <p class="max-w-[50rem] text-balance pb-8 text-center text-lg text-soft sm:text-base">
                No reflection magic, no runtime surprises. ImmediatePlatform libraries strive to
                always warn you about issues ahead of time, during compilation.
            </p>
        </div>

        <div class="flex max-w-[50rem] justify-center lg:px-4 md:w-screen">
            <Window>
                <picture>
                    <source srcset={TypeSafetyExampleScreenshotSmall} media="(max-width: 639px)" />
                    <img
                        class="hue-rotate-180 invert saturate-[3] sepia-[0.28] dark:filter-none"
                        src={TypeSafetyExampleScreenshot}
                        alt="Screenshot of Immediate.Handlers Roslyn analyzer showing a warning about a missing concrete handler implementation."
                    />
                </picture>
            </Window>
        </div>
    </div>
</div>

<Footer />

<style>
    :global(body:has(#home-page) .on-this-page) {
        @apply !hidden;
    }
</style>
