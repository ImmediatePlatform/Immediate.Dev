import type { PageLoad } from './$types';

export const load: PageLoad = () => {
    return {
        seo: {
            title: 'ImmediatePlatform',
            description:
                'Libraries for building modern, maintainable .NET applications leveraging the Vertical Slice Architecture and Mediator pattern with no boilerplate. Extensible. Fast. Source Generated. Open Source.'
        }
    };
};
