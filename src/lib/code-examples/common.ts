import type { CodeFile } from '../types';

export const validationAssemblyAttributes: CodeFile = {
	name: 'AssemblyAttributes.cs',
	content: `[assembly: Behaviors(
	typeof(ValidationBehavior<,>)
)]`
};
