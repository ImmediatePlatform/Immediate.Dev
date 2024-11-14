<script lang="ts">
    import { page } from '$app/stores';
    import { browser } from '$app/environment';
    import { config } from '../../config';
    import type { SEOData, SEODataOverride } from '$lib/types';
    import { type MarkdownFrontmatter } from '@svelteness/kit-docs';

    type FrontmatterMeta = {
        title?: string;
        description?: string;
    } & MarkdownFrontmatter;

    $: url = browser
        ? $page.url.href
        : new URL($page.url.pathname, config.siteUrl || $page.url.origin).href;

    $: pageSeoOverride = $page.data?.seo as SEODataOverride | undefined;
    $: frontmatter = $page.data?.meta?.frontmatter as FrontmatterMeta | undefined;

    $: seo = {
        title:
            pageSeoOverride?.title ??
            (frontmatter?.title ? `${frontmatter.title} | ImmediatePlatform` : 'ImmediatePlatform'),
        description: pageSeoOverride?.description ?? frontmatter?.description,
        image: pageSeoOverride?.image,
        type: 'website',
        canonical: url
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
