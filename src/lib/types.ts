import type { SvelteComponent } from 'svelte';

export type Announcement = {
    text: string;
    highlightedText?: string;
    href: string;
};

export type SEOData = {
    title: string;
    description?: string;
    image?: string;
    type: 'website' | string;
    canonical: string;
};
export type SEODataOverride = Pick<SEOData, 'title' | 'description' | 'image'>;

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
