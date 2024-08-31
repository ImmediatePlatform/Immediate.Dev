import type { SvelteComponent } from 'svelte';

export type CodeFile = {
	name: string;
	content: string;
};

export enum ExampleType {
	WebApi,
	Cli,
	Blazor,
	DiscordBot
}

export type CodeExample = {
	type: ExampleType;
	icon: typeof SvelteComponent;
	label: string;
	contents: CodeFile[];
};
