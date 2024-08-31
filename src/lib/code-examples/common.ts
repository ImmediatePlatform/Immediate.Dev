import type { CodeFile } from '../types';

export const validationAssemblyAttributes: CodeFile = {
	name: 'AssemblyAttributes.cs',
	content: `[assembly: Behaviors(
	typeof(ValidationBehavior<,>)
)]`
};

export const userModel: CodeFile = {
	name: 'User.cs',
	content: `public sealed record User
{
	public int UserId { get; set; }
	public required string EmailAddress { get; set; }

	public string? Name { get; set; }
}`
};
