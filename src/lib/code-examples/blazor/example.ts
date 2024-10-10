import { type CodeExample, ExampleType } from '$lib/types';
import BlazorIcon from '$lib/components/icons/BlazorIcon.svelte';

import CreateTodo from './example_src/CreateTodo.cs?raw';
import IndexRazor from './example_src/Index.razor?raw';
import IndexRazorCs from './example_src/Index.razor.cs?raw';
import TodoModel from './example_src/Todo.cs?raw';

export default {
	type: ExampleType.Blazor,
	label: 'Blazor',
	icon: BlazorIcon,
	contents: [
		{ name: 'Index.razor', content: IndexRazor },
		{ name: 'Index.razor.cs', content: IndexRazorCs },
		{ name: 'CreateTodo.cs', content: CreateTodo },
		{ name: 'Todo.cs', content: TodoModel }
	]
} as CodeExample;
