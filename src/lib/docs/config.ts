import RocketIcon from '@lucide/svelte/icons/rocket';
import BookOpenIcon from '@lucide/svelte/icons/book-open';
import BlocksIcon from '@lucide/svelte/icons/blocks';
import ClockIcon from '@lucide/svelte/icons/clock';
import DatabaseIcon from '@lucide/svelte/icons/database';
import GaugeIcon from '@lucide/svelte/icons/gauge';
import GlobeIcon from '@lucide/svelte/icons/globe';
import PlugIcon from '@lucide/svelte/icons/plug';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import type { DocsConfig } from './types.js';

export const docsConfig: DocsConfig = {
	site: {
		title: 'ImmediatePlatform',
		description:
			'Source-generated .NET libraries for Vertical Slice Architecture, CQRS, validation, APIs, dependency injection, caching, and background jobs.',
		url: import.meta.env.VITE_SITE_URL ?? 'https://immediateplatform.dev',
		social: {
			github: 'https://github.com/ImmediatePlatform/Immediate.Dev'
		}
	},
	sidebar: [
		{
			label: 'Getting Started',
			icon: RocketIcon,
			autogenerate: { directory: 'getting-started' }
		},
		{
			label: 'Immediate.Handlers',
			icon: BlocksIcon,
			autogenerate: { directory: 'Immediate.Handlers' }
		},
		{
			label: 'Immediate.Validation',
			icon: ShieldCheckIcon,
			autogenerate: { directory: 'Immediate.Validation' }
		},
		{
			label: 'Immediate.Apis',
			icon: GlobeIcon,
			autogenerate: { directory: 'Immediate.Apis' }
		},
		{
			label: 'Immediate.Cache',
			icon: DatabaseIcon,
			autogenerate: { directory: 'Immediate.Cache' }
		},
		{
			label: 'Immediate.Injections',
			icon: PlugIcon,
			autogenerate: { directory: 'Immediate.Injections' }
		},
		{
			label: 'Immediate.Jobs',
			icon: ClockIcon,
			autogenerate: { directory: 'Immediate.Jobs' }
		},
		{
			label: 'Cookbook',
			icon: BookOpenIcon,
			autogenerate: { directory: 'cookbook' }
		},
		{
			label: 'Benchmarks',
			icon: GaugeIcon,
			autogenerate: { directory: 'benchmarks' }
		}
	],
	toc: {
		minDepth: 2,
		maxDepth: 3
	}
};
