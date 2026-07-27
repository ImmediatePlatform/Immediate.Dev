import RocketIcon from '@lucide/svelte/icons/rocket';
import BookOpenIcon from '@lucide/svelte/icons/book-open';
import BlocksIcon from '@lucide/svelte/icons/blocks';
import ClockIcon from '@lucide/svelte/icons/clock';
import DatabaseIcon from '@lucide/svelte/icons/database';
import GaugeIcon from '@lucide/svelte/icons/gauge';
import GlobeIcon from '@lucide/svelte/icons/globe';
import LayersIcon from '@lucide/svelte/icons/layers';
import PlugIcon from '@lucide/svelte/icons/plug';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import type { DocsConfig } from './types.js';

const packageGroups = ['Guides', 'Reference', 'Diagnostics'];

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
			autogenerate: { directory: 'getting-started' },
			groups: ['Tutorial']
		},
		{
			label: 'Platform Concepts',
			icon: LayersIcon,
			autogenerate: { directory: 'concepts' }
		},
		{
			label: 'Immediate.Handlers',
			icon: BlocksIcon,
			autogenerate: { directory: 'Immediate.Handlers' },
			groups: packageGroups
		},
		{
			label: 'Immediate.Validations',
			icon: ShieldCheckIcon,
			autogenerate: { directory: 'Immediate.Validations' },
			groups: packageGroups
		},
		{
			label: 'Immediate.Apis',
			icon: GlobeIcon,
			autogenerate: { directory: 'Immediate.Apis' },
			groups: packageGroups
		},
		{
			label: 'Immediate.Cache',
			icon: DatabaseIcon,
			autogenerate: { directory: 'Immediate.Cache' },
			groups: packageGroups
		},
		{
			label: 'Immediate.Injections',
			icon: PlugIcon,
			autogenerate: { directory: 'Immediate.Injections' },
			groups: packageGroups
		},
		{
			label: 'Immediate.Jobs',
			icon: ClockIcon,
			autogenerate: { directory: 'Immediate.Jobs' },
			groups: packageGroups
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
	},
	redirects: {
		'Immediate.Validation/creating-validators': 'Immediate.Validations/creating-validators',
		'Immediate.Validation/custom-messages': 'Immediate.Validations/custom-messages',
		'Immediate.Validation/extending-validation-classes':
			'Immediate.Validations/additional-validations',
		'Immediate.Validation/validating-instances': 'Immediate.Validations/validating-instances',
		'Immediate.Validation/immediate-handlers':
			'Immediate.Validations/immediate-handlers-integration',
		'Immediate.Validation/handling-failures': 'Immediate.Validations/handling-failures',
		'Immediate.Apis/swashbuckle-support': 'Immediate.Apis/openapi',
		'Immediate.Injections/register-services': 'Immediate.Injections/manual-registration',
		'Immediate.Injections/attributes': 'Immediate.Injections/attributes-reference'
	}
};
