<script lang="ts">
    import { cn } from '$lib/utils';
    import type { ClassValue } from 'clsx';

    let className: ClassValue | undefined = undefined;
    export { className as class };
</script>

<hr class={cn('mt-8', className)} />
