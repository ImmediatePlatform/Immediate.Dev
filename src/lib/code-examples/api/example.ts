import { type CodeExample, ExampleType } from '$lib/types';
import { validationAssemblyAttributes } from '../common';
import { Server } from 'lucide-svelte';

import Program from './example_src/Program.cs?raw';
import GetTodo from './example_src/GetTodo.cs?raw';
import Todo from './example_src/Todo.cs?raw';

export default {
	type: ExampleType.WebApi,
	label: 'Web API',
	icon: Server,
	contents: [
		{ name: 'GetTodo.cs', content: GetTodo },
		{ name: 'Todo.cs', content: Todo },
		validationAssemblyAttributes,
		{ name: 'Program.cs', content: Program }
	]
} as CodeExample;
