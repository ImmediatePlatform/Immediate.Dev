import { type CodeExample, ExampleType } from '$lib/types';
import BlazorIcon from '$lib/components/icons/BlazorIcon.svelte';

import GetTodos from './example_src/GetTodos.cs?raw';
import IndexRazor from './example_src/Index.razor?raw';
import Todo from './example_src/Todo.cs?raw';
import Program from './example_src/Program.cs?raw';

export default {
	type: ExampleType.Blazor,
	label: 'Blazor',
	icon: BlazorIcon,
	contents: [
		{ name: 'Index.razor', content: IndexRazor },
		{ name: 'Endpoints/GetTodos.cs', content: GetTodos },
		{ name: 'Todo.cs', content: Todo },
		{ name: 'Program.cs', content: Program }
	]
} as CodeExample;
