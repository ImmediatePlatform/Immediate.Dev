<script lang="ts">
	import '@svelteness/kit-docs/client/polyfills/index.js';
	import '@svelteness/kit-docs/client/styles/fonts.css';

	import '../app.css';
	import '../vars.css';

	import type { LayoutData } from './$types';

	import { page } from '$app/stores';

	import {
		Button,
		KitDocs,
		KitDocsLayout,
		createSidebarContext,
		type NavbarConfig
	} from '@svelteness/kit-docs';

	import Footer from '$lib/components/Footer.svelte';

	export let data: LayoutData;

	$: ({ meta, sidebar } = data);

	const navbar = {
		links: [
			{ title: 'GitHub', slug: 'https://github.com/ImmediatePlatform' },
			{ title: 'Documentation', slug: '/docs', match: /\/docs/ }
		]
	} as NavbarConfig;

	const { activeCategory } = createSidebarContext(sidebar);

	$: category = $activeCategory ? `${$activeCategory}: ` : '';
	$: title = meta ? `${category}${meta.title} | ImmediatePlatform` : null;
	$: description = meta?.description;
</script>

<svelte:head>
	{#key $page.url.pathname}
		{#if title}
			<title>{title}</title>
		{/if}
		{#if description}
			<meta name="description" content={description} />
		{/if}
	{/key}
</svelte:head>

<KitDocs {meta}>
	<div id="mainLayout">
		<KitDocsLayout {navbar} {sidebar}>
			<div class="logo" slot="navbar-left">
				<Button href="/">
					<span
						class="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-2xl font-semibold text-transparent md:text-lg sm:flex sm:flex-col sm:text-center"
					>
						ImmediatePlatform
					</span>
				</Button>
			</div>

			<slot />

			<div slot="main-bottom">
				<Footer />
			</div>
		</KitDocsLayout>
	</div>
</KitDocs>

<style>
	:global(:root.dark) {
		--kd-color-brand-rgb: 213, 149, 76;
	}

	.logo :global(a) {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.logo :global(svg) {
		height: 36px;
		overflow: hidden;
	}

	:global(#mainLayout > div > div > div:first-child) {
		@apply backdrop-blur-sm md:backdrop-blur-md;
	}

	:global(#mainLayout > div > div:first-child > div > div > div:last-child > div:last-child) {
		@apply hidden;
	}

	:global(
			#mainLayout > div > div:first-child > div > div > div > div > div:last-child > div hr,
			#mainLayout
				> div
				> div:first-child
				> div
				> div
				> div
				> div
				> div:last-child
				> div
				section:last-child
		) {
		@apply hidden;
	}
</style>
