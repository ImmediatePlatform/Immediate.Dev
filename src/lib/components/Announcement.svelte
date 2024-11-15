<script lang="ts">
    import type { Announcement } from '$lib/types';
    import { cn } from '$lib/utils';
    import type { ClassValue } from 'clsx';
    import { ChevronRight, Rocket } from 'lucide-svelte';

    let className: ClassValue | undefined = undefined;
    export { className as class };

    export let value: Announcement;
</script>

<div
    class={cn(
        className,
        'rounded-full bg-gradient-to-r from-black/10 via-black/25 to-black/10 p-[1px] dark:from-white/10 dark:via-white/25 dark:to-white/10'
    )}
>
    <a
        class="flex items-center space-x-2 rounded-full bg-body px-4 py-2 text-xs text-inverse backdrop-blur-sm transition-colors duration-300 hover:bg-zinc-100 dark:text-gray-300 dark:hover:bg-black/40"
        href={value.href}
    >
        <Rocket class="h-4 w-4" />
        <span>
            <span class="font-normal">{value.text}</span>
            {#if value.highlightedText}
                {' '}
                <span
                    class="bg-gradient-to-r from-zinc-800 to-black bg-clip-text font-semibold text-transparent dark:from-gray-50 dark:to-gray-200"
                >
                    {value.highlightedText}
                </span>
            {/if}
        </span>
        <ChevronRight class="h-4 w-4" />
    </a>
</div>
