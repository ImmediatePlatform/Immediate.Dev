<script lang="ts">
    import type { ClassValue } from 'clsx';
    import { cn } from '$lib/utils';

    import Highlight from 'svelte-highlight';
    import csharp from 'svelte-highlight/languages/csharp';
    import theme from 'svelte-highlight/styles/github-dark';

    let className: ClassValue | undefined = undefined;
    export { className as class };

    export let code: string;
</script>

<svelte:head>
    {@html theme}
</svelte:head>

<Highlight language={csharp} {code} class={cn('text-sm sm:text-xs', className)} />
