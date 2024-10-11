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

    export let data: LayoutData;

    $: ({ meta, sidebar } = data);

    const navbar = {
        links: [
            { title: 'GitHub', slug: 'https://github.com/ImmediatePlatform' },
            { title: 'Documentation', slug: '/docs', match: /\/docs/ },
            { title: 'Cookbook', slug: '/docs/cookbook/the-cookbook', match: /\/docs\/cookbook/ },
            {
                title: 'Benchmarks',
                slug: '/docs/benchmarks/performance-comparisons',
                match: /\/docs\/benchmarks/
            }
        ]
    } satisfies NavbarConfig;

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
    <KitDocsLayout {navbar} {sidebar}>
        <div class="flex items-center justify-center" slot="navbar-left">
            <Button class="" href="/">
                <span
                    class="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-2xl font-semibold text-transparent md:text-lg sm:flex sm:flex-col sm:text-center"
                >
                    ImmediatePlatform
                </span>
            </Button>
        </div>

        <slot />
    </KitDocsLayout>
</KitDocs>
