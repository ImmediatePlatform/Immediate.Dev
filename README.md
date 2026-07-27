# Immediate.Dev

Public website and documentation for [ImmediatePlatform](https://github.com/ImmediatePlatform), built with SvelteKit, Tailwind CSS, shadcn-svelte, and MDSvex.

The application is based on [code-gio/svelte-docs-starter](https://github.com/code-gio/svelte-docs-starter) at commit [`12b09f1`](https://github.com/code-gio/svelte-docs-starter/commit/12b09f16253b00dfa613c6797b787fa23be09e05).

## Developing

Install Node.js 26 and pnpm 10, then restore dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

## Validation

```bash
pnpm check
pnpm lint
pnpm build
```

`pnpm build` prerenders the site into `build/` and generates its Pagefind search index.

## Documentation content

Documentation pages live under `src/content/docs`. Page order comes from each file's `order` frontmatter value; sidebar section order comes from `src/lib/docs/config.ts`.

To add another package, create its content directory and add one autogeneration entry to the sidebar configuration.

## Deployment

The `Generate Docs` GitHub Actions workflow installs dependencies with pnpm, performs a static production build, and publishes `build/` to GitHub Pages. It is started manually with `workflow_dispatch` and reads the canonical URL from the `SITE_URL` repository variable.
