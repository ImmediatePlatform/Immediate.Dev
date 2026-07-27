export interface PagefindResult {
	url: string;
	meta: { title: string };
	excerpt: string;
}

export interface PagefindSearchResult {
	data(): Promise<PagefindResult>;
}

export interface Pagefind {
	init(): Promise<void>;
	search(query: string): Promise<{ results: PagefindSearchResult[] }>;
}

export async function importPagefind(url: string): Promise<Pagefind> {
	return (await import(/* @vite-ignore */ url)) as Pagefind;
}
