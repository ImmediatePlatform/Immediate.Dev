import type { Announcement } from '$lib/types';

type Config = {
    siteUrl?: string;
    announcement?: Announcement;
};

export const config = Object.freeze<Config>({
    siteUrl: import.meta.env.VITE_SITE_URL as string | undefined,
    announcement: {
        text: 'Introducing',
        highlightedText: 'Immediate.Cache',
        href: '/docs/getting-started/introduction#immediate-cache'
    }
});
