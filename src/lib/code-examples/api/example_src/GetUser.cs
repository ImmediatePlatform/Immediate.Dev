[Handler]
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
}