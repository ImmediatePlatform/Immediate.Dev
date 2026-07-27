import { cpSync, existsSync } from 'node:fs';

const source = 'build/pagefind';
const previewDestination = '.svelte-kit/output/client/pagefind';

if (!existsSync(source)) {
	throw new Error(`Pagefind output was not generated at ${source}.`);
}

// `vite preview` serves SvelteKit's client output rather than adapter-static's
// final directory. Keep the generated index available in both locations.
cpSync(source, previewDestination, { recursive: true, force: true });
