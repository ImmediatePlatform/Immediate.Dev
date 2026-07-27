import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import { createHighlighter } from 'shiki';
import { transformerNotationHighlight, transformerMetaHighlight } from '@shikijs/transformers';

const highlighter = await createHighlighter({
	themes: ['github-dark', 'github-light'],
	langs: [
		'typescript',
		'javascript',
		'svelte',
		'bash',
		'json',
		'css',
		'html',
		'markdown',
		'yaml',
		'shell',
		'csharp',
		'xml'
	]
});

/**
 * @param {string} code
 * @param {string | undefined} lang
 * @param {string | undefined} meta
 */
function codeHighlighter(code, lang, meta) {
	// Parse title from meta: title="filename.ts"
	const titleMatch = meta?.match(/title="([^"]+)"/);
	const title = titleMatch?.[1];

	const html = highlighter.codeToHtml(code, {
		lang: lang || 'text',
		themes: { light: 'github-light', dark: 'github-dark' },
		meta: meta ? { __raw: meta } : undefined,
		transformers: [transformerMetaHighlight(), transformerNotationHighlight()]
	});

	let result = html;

	// Wrap with title header if present
	if (title) {
		result = `<div class="code-block-titled"><div class="code-block-title">${title}</div>${result}</div>`;
	}

	return `{@html \`${result.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`}`;
}

/**
 * GitHub-style slug: lowercase, drop anything but word chars, spaces and hyphens,
 * then collapse whitespace to hyphens.
 * @param {string} text
 */
function slugify(text) {
	return text
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Concatenates the visible text of a hast node.
 * @param {any} node
 * @returns {string}
 */
function textContent(node) {
	if (node.type === 'text') return node.value;
	if (!Array.isArray(node.children)) return '';
	return node.children.map(textContent).join('');
}

/**
 * Gives every heading a stable `id`, so in-page anchors resolve and the
 * table of contents (which filters on `el.id`) has something to collect.
 */
function rehypeHeadingIds() {
	/** @param {any} tree */
	return (tree) => {
		/** @type {Map<string, number>} */
		const seen = new Map();

		/** @param {any} node */
		function walk(node) {
			if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
				node.properties ??= {};
				if (!node.properties.id) {
					const base = slugify(textContent(node));
					if (base) {
						const count = seen.get(base) ?? 0;
						seen.set(base, count + 1);
						node.properties.id = count === 0 ? base : `${base}-${count}`;
					}
				}
			}

			for (const child of node.children ?? []) walk(child);
		}

		walk(tree);
	};
}

const markdownPreprocessor = mdsvex({
	extensions: ['.md', '.svx'],
	rehypePlugins: [rehypeHeadingIds],
	highlight: {
		highlighter: codeHighlighter
	}
});

/**
 * MDSvex 0.12 still emits Svelte's deprecated `context="module"` spelling.
 * Normalize its generated module script until MDSvex ships the Svelte 5 form.
 * @param {import('svelte/compiler').MarkupPreprocessorOptions} options
 */
async function preprocessMarkdown(options) {
	const result = await markdownPreprocessor.markup(options);
	return result
		? { ...result, code: result.code.replace('<script context="module">', '<script module>') }
		: result;
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md', '.svx'],
	preprocess: [{ markup: preprocessMarkdown }],
	kit: {
		adapter: adapter(),
		prerender: {
			handleHttpError: 'warn',
			handleUnseenRoutes: 'warn'
		}
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
