import { getAllDocs, docsConfig } from '$lib/docs/index.js';

export const prerender = true;

export function GET() {
	const docs = getAllDocs();
	const siteUrl = docsConfig.site.url ?? 'https://immediateplatform.dev';

	const pages = [{ href: '/', slug: '' }, ...docs];
	const urls = pages.map(
		(page) => `
  <url>
    <loc>${siteUrl}${page.href}</loc>
    <changefreq>weekly</changefreq>
    <priority>${page.slug === '' ? '1.0' : '0.8'}</priority>
  </url>`
	);

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('')}
</urlset>`.trim();

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
}
