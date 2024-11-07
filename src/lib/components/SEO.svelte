<script lang="ts">
    import { page } from '$app/stores';
    import type { SEOData, SEODataOverride } from '$lib/types';
    import { kitDocs } from '@svelteness/kit-docs';

    $: pageSeoOverride = $page.data?.seo as SEODataOverride | undefined | null;
    $: seo = {
        title:
            pageSeoOverride?.title ??
            ($kitDocs?.meta?.title
                ? `${$kitDocs.meta.title} | ImmediatePlatform`
                : 'ImmediatePlatform'),
        description: pageSeoOverride?.description ?? $kitDocs?.meta?.description,
        image: pageSeoOverride?.image,
        type: 'website',
        canonical: new URL($page.url.pathname, import.meta.env.VITE_SITE_URL || $page.url.origin)
            .href
    } satisfies SEOData;
</script>

<svelte:head>
    {#key $page.url.pathname}
        <meta property="og:site_name" content="ImmediatePlatform" />
        <meta property="og:type" content={seo.type ?? 'website'} />
        <meta property="og:url" content={seo.canonical} />

        <!-- Title -->
        <title>{seo.title}</title>
        <meta property="og:title" content={seo.title} />
        <meta name="twitter:title" content={seo.title} />

        <!-- Discord-specific -->
        <meta name="theme-color" content="#d946ef" />

        <!-- Twitter -->
        <meta name="twitter:card" content="summary" />

        {#if seo.description}
            <meta name="description" content={seo.description} />
            <meta property="og:description" content={seo.description} />
            <meta name="twitter:description" content={seo.description} />
        {/if}
        {#if seo.image}
            <meta property="og:image" content={seo.image} />
            <meta name="twitter:image" content={seo.image} />
        {/if}
    {/key}
</svelte:head>
