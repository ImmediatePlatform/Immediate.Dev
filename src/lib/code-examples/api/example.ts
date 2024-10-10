import { type CodeExample, ExampleType } from '$lib/types';
import { validationAssemblyAttributes, userModel } from '../common';
import { Server } from 'lucide-svelte';

import Program from './example_src/Program.cs?raw';
import GetUser from './example_src/GetUser.cs?raw';

export default {
	type: ExampleType.WebApi,
	label: 'Web API',
	icon: Server,
	contents: [
		{ name: 'GetUser.cs', content: GetUser },
		userModel,
		validationAssemblyAttributes,
		{ name: 'Program.cs', content: Program }
	]
} as CodeExample;
