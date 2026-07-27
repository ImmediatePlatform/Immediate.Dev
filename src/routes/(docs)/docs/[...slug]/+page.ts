import { docsConfig, getAllDocs, getDoc, getPrevNext, getRawContent } from '$lib/docs/index.js';
import { error, redirect } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types.js';

export const load: PageLoad = ({ params }) => {
	const target = docsConfig.redirects?.[params.slug];
	if (target) redirect(308, `/docs/${target}`);

	const doc = getDoc(params.slug);
	if (!doc) throw error(404, `Page not found: ${params.slug}`);

	const { prev, next } = getPrevNext(params.slug);

	return {
		meta: doc.meta,
		slug: params.slug,
		prev,
		next,
		rawContent: getRawContent(params.slug)
	};
};

// Redirect sources have no doc of their own, so the crawler never discovers them.
// Listing them here makes the prerenderer emit a page for each old URL.
export const entries: EntryGenerator = () => [
	...getAllDocs().map((doc) => ({ slug: doc.slug })),
	...Object.keys(docsConfig.redirects ?? {}).map((slug) => ({ slug }))
];
