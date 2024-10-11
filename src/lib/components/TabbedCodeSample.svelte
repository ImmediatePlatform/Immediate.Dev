<script lang="ts">
    import type { CodeFile } from '$lib/types';
    import type { ClassValue } from 'clsx';

    import { fade } from 'svelte/transition';
    import { Copy } from 'lucide-svelte';
    import { cn } from '$lib/utils';

    import CodeSample from './CodeSample.svelte';

    let className: ClassValue | undefined = undefined;
    let activeTabIndex = 0;
    let copied = false;
    let timer: NodeJS.Timeout;

    export let tabs: CodeFile[];
    export { className as class };
    export let codeSampleClass: ClassValue;

    const switchTab = (newIndex: number) => {
        activeTabIndex = newIndex;
    };

    const onCopyClick = () => {
        navigator.clipboard.writeText(content);
        copied = true;

        clearTimeout(timer);

        timer = setTimeout(() => {
            copied = false;
        }, 2000);
    };

    $: {
        tabs, (activeTabIndex = 0);
    }
    $: content = tabs[activeTabIndex].content;
</script>

<div class={cn('flex gap-1 overflow-auto rounded-t-md bg-background-lighter px-2 pt-2', className)}>
    {#each tabs as tab, i}
        <button
            class={cn(
                'flex-none items-center justify-center gap-0.5 overflow-hidden rounded-t-md px-4 py-2 text-sm hover:bg-background-lightest',
                {
                    'border-b-4 border-b-brand font-semibold hover:bg-background-lighter':
                        i === activeTabIndex
                }
            )}
            on:click={() => switchTab(i)}
        >
            <span class="select-none">{tab.name}</span>
        </button>
    {/each}

    <div class="my-auto ml-auto mr-2 flex-none items-center text-soft hover:text-white sm:hidden">
        {#if copied}
            <div
                class="flex rounded bg-brand px-3 py-1 font-mono text-xs text-black"
                in:fade={{ duration: 400 }}
            >
                <span class="select-none text-center text-inverse">Copied!</span>
            </div>
        {:else}
            <button on:click={onCopyClick} in:fade={{ duration: 400 }}>
                <Copy class="h-5" />
            </button>
        {/if}
    </div>
</div>
<CodeSample code={content} class={codeSampleClass} />
