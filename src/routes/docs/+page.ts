import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const prerender = true;

export function load(): PageLoad {
    redirect(308, '/docs/getting-started/introduction');
}
