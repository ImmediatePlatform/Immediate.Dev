import { type CodeFile, type CodeExample, ExampleType } from '$lib/types';
import { userModel } from './common';
import BlazorIcon from '$lib/components/icons/BlazorIcon.svelte';

export default {
	type: ExampleType.Blazor,
	label: 'Blazor',
	icon: BlazorIcon,
	contents: [userModel]
} as CodeExample;
