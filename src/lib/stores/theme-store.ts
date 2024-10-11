import { writable } from 'svelte/store';

export const isDarkMode = writable(false);

export function initializeTheme() {
    if (typeof window !== 'undefined') {
        const html = document.documentElement;

        const updateDarkMode = () => {
            isDarkMode.set(html.classList.contains('dark'));
        };

        updateDarkMode();

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateDarkMode();
                }
            });
        });

        observer.observe(html, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }
}
