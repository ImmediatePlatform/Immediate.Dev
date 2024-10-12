<script lang="ts">
    import { cn } from '$lib/utils';
    import type { ClassValue } from 'clsx';

    let className: ClassValue | undefined = undefined;

    export let title: string = '';
    export { className as class };
</script>

<div>
    <div
        class={cn(
            'flex-none rounded-t-md border border-b-0 border-border bg-[#e8e8e8] dark:bg-[#3f4044]',
            className
        )}
    >
        <div class="flex h-8 items-center justify-center space-x-1.5 px-3 sm:h-6">
            <div class="h-2.5 w-2.5 rounded-full bg-red-500 sm:h-1.5 sm:w-1.5"></div>
            <div class="h-2.5 w-2.5 rounded-full bg-yellow-500 sm:h-1.5 sm:w-1.5"></div>
            <div class="h-2.5 w-2.5 rounded-full bg-green-500 sm:h-1.5 sm:w-1.5"></div>
            <div class="flex w-full items-center justify-center pr-[1.875rem]">
                <span class="text-center">{title}</span>
            </div>
        </div>
    </div>
    <div class="overflow-hidden rounded-b-md border border-border dark:border-none">
        <slot />
    </div>
</div>
