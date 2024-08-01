import { createKitDocsLoader } from '@svelteness/kit-docs';

export const ssr = false;

/** @type {import('./$types').LayoutLoad} */
export const load = createKitDocsLoader({
	sidebar: {
		'/': null,
		'/docs': '/docs'
	}
});
