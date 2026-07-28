import { docsConfig } from './config.js';
import { getDocsByDirectory, getAllDocs } from './content.js';
import type { DocPage, NavItem, SidebarSection } from './types.js';

function toNavItem(doc: DocPage): NavItem {
	return {
		title: doc.meta.sidebar?.label ?? doc.meta.title,
		href: doc.href,
		order: doc.meta.order
	};
}

function byOrder(a: NavItem, b: NavItem): number {
	return (a.order ?? 999) - (b.order ?? 999);
}

/**
 * Splits a section's docs into ungrouped leaves (rendered first) followed by one
 * nested item per `meta.group`, ordered by `section.groups` then first-seen order.
 */
function buildSectionItems(docs: DocPage[], section: SidebarSection): NavItem[] {
	const ungrouped: NavItem[] = [];
	const grouped = new Map<string, NavItem[]>();

	for (const doc of docs) {
		const group = doc.meta.group;
		if (!group) {
			ungrouped.push(toNavItem(doc));
			continue;
		}

		let bucket = grouped.get(group);
		if (!bucket) {
			bucket = [];
			grouped.set(group, bucket);
		}
		bucket.push(toNavItem(doc));
	}

	ungrouped.sort(byOrder);

	const declared = section.groups ?? [];
	const groupNames = [...grouped.keys()].sort((a, b) => {
		const aIndex = declared.indexOf(a);
		const bIndex = declared.indexOf(b);
		if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
		if (aIndex !== -1) return -1;
		if (bIndex !== -1) return 1;
		return 0;
	});

	const items = [...ungrouped];
	for (const name of groupNames) {
		const groupItems = grouped.get(name)!;
		groupItems.sort(byOrder);
		items.push({
			title: name,
			items: groupItems,
			order: groupItems[0]?.order
		});
	}

	return items;
}

export function generateNavigation(): NavItem[] {
	const nav: NavItem[] = [];

	for (const section of docsConfig.sidebar) {
		if (section.autogenerate) {
			const docs = getDocsByDirectory(section.autogenerate.directory);

			nav.push({
				title: section.label,
				icon: section.icon,
				items: buildSectionItems(docs, section)
			});
		} else if (section.items) {
			nav.push({
				title: section.label,
				icon: section.icon,
				items: section.items.map((item) => ({
					title: item.label,
					href: item.href
				}))
			});
		}
	}

	return nav;
}

export function getNavigation(): NavItem[] {
	return generateNavigation();
}

export function getPrevNext(currentSlug: string): { prev?: NavItem; next?: NavItem } {
	const allDocs = getAllDocs();
	const index = allDocs.findIndex((doc) => doc.slug === currentSlug);
	if (index === -1) return {};

	return {
		prev:
			index > 0
				? { title: allDocs[index - 1].meta.title, href: allDocs[index - 1].href }
				: undefined,
		next:
			index < allDocs.length - 1
				? { title: allDocs[index + 1].meta.title, href: allDocs[index + 1].href }
				: undefined
	};
}
