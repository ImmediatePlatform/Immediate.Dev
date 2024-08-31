import { type CodeFile, type CodeExample, ExampleType } from '$lib/types';
import { userModel } from './common';
import { SquareChevronRight } from 'lucide-svelte';

export default {
	type: ExampleType.Cli,
	label: 'CLI',
	icon: SquareChevronRight,
	contents: [userModel]
} as CodeExample;
