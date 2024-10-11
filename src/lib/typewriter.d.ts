declare module 'typewriter-effect/dist/core' {
    export interface TypewriterOptions {
        strings?: string | string[];
        cursor?: string;
        delay?: 'natural' | number;
        deleteSpeed?: 'natural' | number;
        loop?: boolean;
        autoStart?: boolean;
        pauseFor?: number;
        devMode?: boolean;
        skipAddStyles?: boolean;
        wrapperClassName?: string;
        cursorClassName?: string;
        stringSplitter?: (string) => string[];
    }

    export default class Typewriter {
        constructor(element: HTMLElement | string, options?: TypewriterOptions);

        start(): void;
        stop(): void;
        pauseFor(ms: number): void;
        typeString(string: string): Typewriter;
        pasteString(string: string): Typewriter;
        deleteAll(speed?: number): Typewriter;
        deleteChars(amount: number): Typewriter;
        changeDeleteSpeed(speed: number): Typewriter;
        changeDelay(delay: number): Typewriter;
        changeDeleteDelay(delay: number): Typewriter;
        typeCharacters(characters: string[]): Typewriter;
    }
}
