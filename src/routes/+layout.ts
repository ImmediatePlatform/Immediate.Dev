import { createKitDocsLoader } from '@svelteness/kit-docs';
import type { LayoutLoad } from './$types';

export const ssr = false;

export const load: LayoutLoad = createKitDocsLoader({
	sidebar: {
		'/': null,
		'/docs': '/docs'
	}
});
