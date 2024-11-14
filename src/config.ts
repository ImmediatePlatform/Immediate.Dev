type Config = {
    siteUrl?: string;
};

export const config = Object.freeze<Config>({
    siteUrl: import.meta.env.VITE_SITE_URL as string | undefined
});
