<script lang="ts">
    import '@svelteness/kit-docs/client/polyfills/index.js';
    import '@svelteness/kit-docs/client/styles/fonts.css';

    import '../app.css';
    import '../vars.css';
    import '../codefence.css';

    import SEO from '$lib/components/SEO.svelte';

    import type { LayoutData } from './$types';

    import {
        Button,
        KitDocs,
        KitDocsLayout,
        createSidebarContext,
        type NavbarConfig
    } from '@svelteness/kit-docs';
    import { onMount } from 'svelte';
    import { initializeTheme } from '$lib/stores/theme-store';

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

    createSidebarContext(sidebar);

    onMount(() => {
        const cleanup = initializeTheme();
        return cleanup;
    });
</script>

<SEO />

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
