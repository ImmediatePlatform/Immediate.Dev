<script lang="ts">
    import type { ClassValue } from 'clsx';
    import { cn } from '$lib/utils';

    import Highlight from 'svelte-highlight';
    import csharp from 'svelte-highlight/languages/csharp';
    import darkTheme from 'svelte-highlight/styles/github-dark';
    import lightTheme from 'svelte-highlight/styles/github';
    import { isDarkMode } from '$lib/stores/theme-store';

    let className: ClassValue | undefined = undefined;
    export { className as class };

    export let code: string;
</script>

<svelte:head>
    {#if $isDarkMode}
        {@html darkTheme}
    {:else}
        {@html lightTheme}
    {/if}
</svelte:head>

<Highlight language={csharp} {code} class={cn('text-sm sm:text-xs', className)} />
