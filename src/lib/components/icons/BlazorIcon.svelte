<script lang="ts">
    import { cn } from '$lib/utils';
    import type { ClassValue } from 'clsx';

    let className: ClassValue | undefined = undefined;

    export { className as class };
</script>

<img
    src="blazor.png"
    class={cn('opacity-90 brightness-0 filter dark:opacity-100 dark:invert', className)}
    alt="Blazor logo"
/>
