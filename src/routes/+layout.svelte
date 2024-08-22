<script>
	import '@svelteness/kit-docs/client/polyfills/index.js';
	import '@svelteness/kit-docs/client/styles/fonts.css';

	import '../app.css';
	import '../vars.css';

	import { page } from '$app/stores';

	import { Button, KitDocs, KitDocsLayout, createSidebarContext } from '@svelteness/kit-docs';

	/** @type {import('./$types').LayoutData} */
	export let data;

	$: ({ meta, sidebar } = data);

	/** @type {import('@svelteness/kit-docs').NavbarConfig} */
	const navbar = {
		links: [{ title: 'Documentation', slug: '/docs', match: /\/docs/ }]
	};

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
						class="pb-4 text-2xl font-semibold tracking-wider text-inverse md:text-5xl sm:flex sm:flex-col sm:text-center"
					>
						ImmediatePlatform
					</span>
				</Button>
			</div>

			<slot />
		</KitDocsLayout>
	</div>
</KitDocs>

<style>
	:global(:root) {
		--kd-color-brand-rgb: 233, 127, 6;
	}

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
		@apply backdrop-blur-md;
	}

	:global(#mainLayout > div > div:first-child > div > div > div:last-child > div:last-child) {
		display: none;
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
		display: none;
	}
</style>
