import { type CodeFile, type CodeExample, ExampleType } from '$lib/types';
import { validationAssemblyAttributes, userModel } from './common';
import { Server } from 'lucide-svelte';

const getUser: CodeFile = {
	name: 'GetUser.cs',
	content: `[Handler]
[MapGet("/api/users/{UserId}")]
public static partial class GetUser
{
	[Validate]
	public sealed partial record Query : IValidationTarget<Query>
	{
        [GreaterThan(0)]
		public int UserId { get; set; }
	}

	private static async ValueTask<User> HandleAsync(
		Query query,
		DbContext context,
		CancellationToken token
	) => await context.Users
			.Where(u => u.UserId == query.UserId)
			.SelectDto()
			.SingleOrDefaultAsync(token);
}`
};

export default {
	type: ExampleType.WebApi,
	label: 'Web API',
	icon: Server,
	contents: [getUser, userModel, validationAssemblyAttributes]
} as CodeExample;
