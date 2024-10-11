import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    extensions: ['.svelte', '.md'],

    kit: {
        adapter: adapter({
            strict: false
        }),
        prerender: {
            handleMissingId: 'warn'
        },
        alias: {
            img: './src/img'
        }
    },
    preprocess: vitePreprocess()
};

export default config;
