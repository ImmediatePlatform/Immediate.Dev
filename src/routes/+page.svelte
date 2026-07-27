<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import DarkModeSwitcher from '$lib/components/theme/dark-mode-switcher.svelte';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import BlocksIcon from '@lucide/svelte/icons/blocks';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import GaugeIcon from '@lucide/svelte/icons/gauge';
	import GithubIcon from '@lucide/svelte/icons/github';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import PackageIcon from '@lucide/svelte/icons/package';
	import PlugIcon from '@lucide/svelte/icons/plug';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import ZapIcon from '@lucide/svelte/icons/zap';

	const features = [
		{
			icon: ZapIcon,
			title: 'Source generated',
			description:
				'Generate dispatch, registration, validation, and endpoint plumbing at compile time.'
		},
		{
			icon: ShieldCheckIcon,
			title: 'Compile-time safe',
			description:
				'Catch invalid configurations during the build instead of discovering them in production.'
		},
		{
			icon: BlocksIcon,
			title: 'Modular by design',
			description:
				'Adopt only the packages your application needs and combine them with your existing stack.'
		},
		{
			icon: GaugeIcon,
			title: 'Built for performance',
			description:
				'Avoid runtime reflection and service-location overhead on the paths your application uses most.'
		}
	];

	const packages = [
		{
			name: 'Immediate.Handlers',
			description: 'Mediator and CQRS handlers with compile-time pipelines.',
			href: '/docs/Immediate.Handlers/creating-handlers',
			icon: BlocksIcon
		},
		{
			name: 'Immediate.Validations',
			description: 'High-performance validation generated from your request types.',
			href: '/docs/Immediate.Validations/creating-validators',
			icon: ShieldCheckIcon
		},
		{
			name: 'Immediate.Apis',
			description: 'Generate ASP.NET Core Minimal API endpoints from handlers.',
			href: '/docs/Immediate.Apis/creating-endpoints',
			icon: GlobeIcon
		},
		{
			name: 'Immediate.Cache',
			description: 'Cache handler responses with declarative policies.',
			href: '/docs/Immediate.Cache/creating-a-cache',
			icon: DatabaseIcon
		},
		{
			name: 'Immediate.Injections',
			description: 'Source-generated Microsoft dependency injection registrations.',
			href: '/docs/Immediate.Injections/registering-services',
			icon: PlugIcon
		},
		{
			name: 'Immediate.Jobs',
			description: 'Reflection-free, durable background jobs built on Immediate.Handlers.',
			href: '/docs/Immediate.Jobs/introduction',
			icon: ClockIcon
		}
	];

	const steps = [
		{
			step: '01',
			title: 'Install a package',
			description: 'Start with Immediate.Handlers and add the integrations your application needs.',
			code: 'dotnet add package Immediate.Handlers'
		},
		{
			step: '02',
			title: 'Write the application code',
			description:
				'Use focused handlers, validators, endpoints, services, or jobs without framework boilerplate.'
		},
		{
			step: '03',
			title: 'Register generated services',
			description:
				'Call the generated extension methods and let compile-time diagnostics validate the wiring.'
		}
	];
</script>

<svelte:head>
	<title>ImmediatePlatform</title>
	<meta
		name="description"
		content="Source-generated .NET libraries for Vertical Slice Architecture, CQRS, validation, APIs, dependency injection, caching, and background jobs."
	/>
</svelte:head>

<nav class="bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
		<a href="/" class="flex items-center gap-2">
			<SparklesIcon class="text-primary size-6" />
			<span class="text-lg font-bold">ImmediatePlatform</span>
		</a>
		<div class="hidden items-center gap-6 md:flex">
			<a href="/" class="text-foreground text-sm font-medium">Home</a>
			<a
				href="/docs/getting-started/introduction"
				class="text-muted-foreground hover:text-foreground text-sm">Documentation</a
			>
			<a
				href="/docs/cookbook/the-cookbook"
				class="text-muted-foreground hover:text-foreground text-sm">Cookbook</a
			>
			<a
				href="/docs/benchmarks/performance-comparisons"
				class="text-muted-foreground hover:text-foreground text-sm">Benchmarks</a
			>
		</div>
		<div class="flex items-center gap-2">
			<DarkModeSwitcher />
			<Button
				variant="ghost"
				size="icon"
				href="https://github.com/ImmediatePlatform"
				target="_blank"
				aria-label="ImmediatePlatform on GitHub"
			>
				<GithubIcon class="size-4" />
			</Button>
		</div>
	</div>
</nav>

<main>
	<section class="relative overflow-hidden">
		<div class="from-primary/5 via-background to-background absolute inset-0 bg-linear-to-b"></div>
		<div
			class="from-primary/10 to-primary/0 absolute top-0 left-1/2 hidden size-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-b blur-3xl sm:block"
		></div>
		<div class="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:py-40">
			<div
				class="bg-muted text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
			>
				<PackageIcon class="size-3.5" />
				<span>Modular libraries for modern .NET applications</span>
			</div>
			<h1 class="text-foreground mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
				Vertical Slice Architecture,
				<span class="from-primary to-primary/60 bg-linear-to-r bg-clip-text text-transparent">
					simplified
				</span>
			</h1>
			<p class="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg sm:text-xl">
				Build maintainable applications with source-generated handlers, validation, APIs, dependency
				injection, caching, and background jobs—without reflection or repetitive plumbing.
			</p>
			<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
				<Button size="lg" href="/docs/getting-started/introduction" class="gap-2 px-6">
					Get started
					<ArrowRightIcon class="size-4" />
				</Button>
				<Button
					variant="outline"
					size="lg"
					href="https://github.com/ImmediatePlatform"
					target="_blank"
					class="gap-2 px-6"
				>
					<GithubIcon class="size-4" />
					View on GitHub
				</Button>
			</div>
		</div>
	</section>

	<section class="border-t py-20 sm:py-28">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="mb-14 text-center">
				<h2 class="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
					Less runtime magic, more compiler guarantees
				</h2>
				<p class="text-muted-foreground mx-auto max-w-2xl text-lg">
					ImmediatePlatform moves repetitive infrastructure work into source generators and
					analyzers.
				</p>
			</div>
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each features as feature (feature.title)}
					<div
						class="hover:border-primary/20 group rounded-xl border p-6 transition-all hover:shadow-lg"
					>
						<div
							class="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-lg"
						>
							<feature.icon class="size-6" />
						</div>
						<h3 class="text-foreground mb-2 text-lg font-semibold">{feature.title}</h3>
						<p class="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="bg-muted/50 border-t py-20 sm:py-28">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="mb-14 text-center">
				<h2 class="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
					Choose only what you need
				</h2>
				<p class="text-muted-foreground mx-auto max-w-2xl text-lg">
					Each package works independently and integrates naturally with the rest of the platform.
				</p>
			</div>
			<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each packages as item (item.name)}
					<a
						href={item.href}
						class="bg-background hover:border-primary/30 group flex gap-4 rounded-xl border p-6 transition-all hover:shadow-md"
					>
						<div
							class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg"
						>
							<item.icon class="size-5" />
						</div>
						<div>
							<h3 class="text-foreground group-hover:text-primary font-semibold transition-colors">
								{item.name}
							</h3>
							<p class="text-muted-foreground mt-1 text-sm leading-relaxed">{item.description}</p>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>

	<section class="border-t py-20 sm:py-28">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="mb-14 text-center">
				<h2 class="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
					Get started in three steps
				</h2>
				<p class="text-muted-foreground mx-auto max-w-2xl text-lg">
					Add ImmediatePlatform incrementally to a new or existing application.
				</p>
			</div>
			<div class="grid gap-8 sm:grid-cols-3">
				{#each steps as step (step.step)}
					<div class="bg-background relative min-w-0 overflow-hidden rounded-xl border p-8">
						<span class="text-primary/20 absolute top-4 right-6 text-5xl font-bold"
							>{step.step}</span
						>
						<h3 class="text-foreground mb-3 text-xl font-semibold">{step.title}</h3>
						<p class="text-muted-foreground mb-4 text-sm leading-relaxed">{step.description}</p>
						{#if step.code}
							<pre class="bg-muted overflow-x-auto rounded-lg p-3 text-xs"><code>{step.code}</code
								></pre>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="bg-muted/50 border-y py-20 text-center sm:py-28">
		<div class="mx-auto max-w-3xl px-4 sm:px-6">
			<h2 class="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
				Ready to build a vertical slice?
			</h2>
			<p class="text-muted-foreground mb-8 text-lg">
				Follow the quickstart or browse complete examples in the cookbook.
			</p>
			<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
				<Button size="lg" href="/docs/getting-started/quickstart" class="gap-2">
					Read the quickstart
					<ArrowRightIcon class="size-4" />
				</Button>
				<Button variant="outline" size="lg" href="/docs/cookbook/the-cookbook">
					Browse the cookbook
				</Button>
			</div>
		</div>
	</section>
</main>

<footer class="py-10">
	<div
		class="text-muted-foreground mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm sm:flex-row sm:px-6 lg:px-8"
	>
		<p>Built by the ImmediatePlatform community.</p>
		<div class="flex items-center gap-5">
			<a href="/docs/getting-started/introduction" class="hover:text-foreground">Documentation</a>
			<a href="https://github.com/ImmediatePlatform" class="hover:text-foreground">GitHub</a>
		</div>
	</div>
</footer>
