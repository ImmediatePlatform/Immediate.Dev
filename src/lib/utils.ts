import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const scrollIntoView = (target: HTMLElement): void => {
	target.scrollIntoView({
		behavior: 'smooth'
	});
};
