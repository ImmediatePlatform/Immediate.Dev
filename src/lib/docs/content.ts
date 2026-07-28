import { docsConfig } from './config.js';
import type { DocFile, DocMeta, DocPage } from './types.js';

const contentModules = import.meta.glob<DocFile>('/src/content/docs/**/*.{md,svx}', {
	eager: true
});

const rawModules = import.meta.glob<string>('/src/content/docs/**/*.{md,svx}', {
	query: '?raw',
	eager: true,
	import: 'default'
});

function slugFromPath(path: string, prefix: string): string {
	return path
		.replace(prefix, '')
		.replace(/\.(md|svx)$/, '')
		.replace(/(?:^|\/)index$/, '');
}

function buildDocs(
	modules: Record<string, DocFile>,
	prefix: string,
	hrefPrefix: string
): DocPage[] {
	const docs: DocPage[] = [];

	for (const [path, mod] of Object.entries(modules)) {
		const meta = mod.metadata as DocMeta;
		if (meta?.draft) continue;

		const slug = slugFromPath(path, prefix);
		docs.push({
			slug,
			href: slug ? `${hrefPrefix}/${slug}` : hrefPrefix,
			meta: {
				title: meta?.title ?? slug.split('/').pop() ?? '',
				description: meta?.description ?? '',
				order: meta?.order,
				group: meta?.group,
				sidebar: meta?.sidebar,
				lastUpdated: meta?.lastUpdated
			},
			component: mod.default
		});
	}

	const sectionOrder = new Map(
		docsConfig.sidebar.map((section, index) => [section.autogenerate?.directory, index])
	);

	return docs.sort((a, b) => {
		const aSection = sectionOrder.get(a.slug.split('/')[0]) ?? Number.MAX_SAFE_INTEGER;
		const bSection = sectionOrder.get(b.slug.split('/')[0]) ?? Number.MAX_SAFE_INTEGER;
		return (
			aSection - bSection ||
			(a.meta.order ?? 999) - (b.meta.order ?? 999) ||
			a.meta.title.localeCompare(b.meta.title)
		);
	});
}

export function getAllDocs(): DocPage[] {
	return buildDocs(contentModules, '/src/content/docs/', '/docs');
}

export function getDoc(slug: string): DocPage | undefined {
	return getAllDocs().find((doc) => doc.slug === slug);
}

export function getRawContent(slug: string): string {
	const path = slug ? `/src/content/docs/${slug}.md` : '/src/content/docs/index.md';
	return rawModules[path] ?? '';
}

export function getDocsByDirectory(directory: string): DocPage[] {
	return getAllDocs().filter(
		(doc) => doc.slug.startsWith(directory + '/') || doc.slug === directory
	);
}
