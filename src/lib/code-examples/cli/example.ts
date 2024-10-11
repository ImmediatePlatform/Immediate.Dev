import { type CodeExample, ExampleType } from '$lib/types';
import { SquareChevronRight } from 'lucide-svelte';

import Program from './example_src/Program.cs?raw';
import RootCommand from './example_src/RootCommand.cs?raw';
import Query from './example_src/Queries/GetRandomNumber.cs?raw';

export default {
    type: ExampleType.Cli,
    label: 'CLI',
    icon: SquareChevronRight,
    contents: [
        { name: 'Queries/GetRandomNumber.cs', content: Query },
        { name: 'RootCommand.cs', content: RootCommand },
        { name: 'Program.cs', content: Program }
    ]
} as CodeExample;
