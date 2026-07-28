import type { Component } from 'svelte';

export interface DocMeta {
	title: string;
	description: string;
	order?: number;
	/** Optional middle sidebar level. Docs without a group render before all groups. */
	group?: string;
	sidebar?: { label?: string };
	draft?: boolean;
	lastUpdated?: string;
}

export interface DocFile {
	default: Component;
	metadata: DocMeta;
}

export interface DocPage {
	slug: string;
	href: string;
	meta: DocMeta;
	component: Component;
}

export interface NavItem {
	title: string;
	href?: string;
	items?: NavItem[];
	order?: number;
	isActive?: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon?: any;
}

export interface SiteConfig {
	title: string;
	description: string;
	url?: string;
	logo?: string;
	logoDark?: string;
	favicon?: string;
	social?: {
		github?: string;
		twitter?: string;
		discord?: string;
	};
}

export interface VersionConfig {
	current: string;
	versions: { label: string; href: string }[];
}

export interface DocsConfig {
	site: SiteConfig;
	sidebar: SidebarSection[];
	toc?: { minDepth?: number; maxDepth?: number };
	versions?: VersionConfig;
	/** Old slug -> new slug. Served as 308s and emitted during prerender. */
	redirects?: Record<string, string>;
}

export interface SidebarSection {
	label: string;
	autogenerate?: { directory: string };
	items?: { label: string; href: string }[];
	/** Display order of `DocMeta.group` values within this section. */
	groups?: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon?: any;
}

export interface TableOfContentsItem {
	id: string;
	text: string;
	depth: number;
}
