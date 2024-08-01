import type { Tab } from './types';

export enum MasterExample {
	WebApi,
	Cli,
	Blazor,
	DiscordBot
}

const assemblyCode: Tab = {
	title: 'AssemblyAttributes.cs',
	content: `[assembly: Behaviors(
	typeof(ValidationBehavior<,>)
)]`
};

const apiCode: Tab = {
	title: 'GetUser.cs',
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
			.FirstNotFoundAsync("User", token);
}`
};

const userCode: Tab = {
	title: 'User.cs',
	content: `public sealed record User
{
	public int UserId { get; set; }
	public required string EmailAddress { get; set; }

	public string? Name { get; set; }
}`
};

export const apiSampleTabs = [apiCode, userCode, assemblyCode];

export const cliSampleTabs = [userCode];
