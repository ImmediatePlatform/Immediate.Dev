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
        'rounded-full bg-gradient-to-r from-white/10 via-white/25 to-white/10 p-[1px]'
    )}
>
    <a
        class="flex items-center space-x-2 rounded-full bg-body px-4 py-2 text-xs text-gray-300 backdrop-blur-sm transition-colors duration-300 hover:bg-black/40"
        href={value.href}
    >
        <Rocket class="h-4 w-4" />
        <span>
            <span class="font-normal">{value.text}</span>
            {#if value.highlightedText}
                {' '}
                <span
                    class="bg-gradient-to-r from-gray-50 to-gray-200 bg-clip-text font-semibold text-transparent"
                >
                    {value.highlightedText}
                </span>
            {/if}
        </span>
        <ChevronRight class="h-4 w-4" />
    </a>
</div>
