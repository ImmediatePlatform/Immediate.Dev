import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const docsDirectory = 'build/docs';

async function* walk(directory) {
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);

		if (entry.isDirectory()) {
			yield* walk(path);
		} else {
			yield path;
		}
	}
}

for await (const path of walk(docsDirectory)) {
	if (!path.endsWith('.html')) continue;

	const content = await readFile(path, 'utf8');
	if (/<html(?:\s|>)/i.test(content)) continue;

	if (!/<meta\s+http-equiv="refresh"/i.test(content)) {
		throw new Error(`HTML output without a root element is not a prerendered redirect: ${path}`);
	}

	await writeFile(
		path,
		`<!doctype html>\n<html lang="en">\n\t<head>\n\t\t${content}\n\t</head>\n\t<body></body>\n</html>\n`
	);
}
