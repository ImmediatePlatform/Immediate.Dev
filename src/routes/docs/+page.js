import { redirect } from '@sveltejs/kit';

export const prerender = true;

/** @type {import('./$types').PageLoad} */
export function load() {
	redirect(308, '/docs/first-category/first-page');
}
