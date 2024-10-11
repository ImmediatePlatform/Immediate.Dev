<script lang="ts">
    import { onMount } from 'svelte';
    import Typewriter from 'typewriter-effect/dist/core';

    export let strings: string[];

    export let delay: number | 'natural' = 'natural';
    export let pauseFor: number = 1500;
    export let autoStart: boolean = true;
    export let loop: boolean = true;

    let typewriterDiv: HTMLDivElement;

    onMount(() => {
        new Typewriter(typewriterDiv, {
            loop: loop,
            autoStart: autoStart,
            delay: delay,
            pauseFor: pauseFor,
            strings: strings
        });
    });
</script>

<div id="typewriter" bind:this={typewriterDiv}></div>
