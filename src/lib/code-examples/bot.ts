import { type CodeFile, type CodeExample, ExampleType } from '$lib/types';
import { userModel } from './common';
import { Bot } from 'lucide-svelte';

export default {
	type: ExampleType.DiscordBot,
	label: 'Discord Bot',
	icon: Bot,
	contents: [userModel]
} as CodeExample;
