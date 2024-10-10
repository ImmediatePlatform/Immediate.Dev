public enum TodoPriority
{
	None = 0,
	Low = 1,
	Mid = 2,
	High = 3,
}

public enum TodoStatus
{
	None = 0,
	Inactive = 1,
	Active = 2,
	Completed = 3,
}

[ValueObject]
[Validate]
public readonly partial record struct TodoId : IValidationTarget<TodoId>
{
	private static void AdditionalValidations(ValidationResult errors, TodoId userId)
	{
		errors.Add(
			() => GreaterThanAttribute.ValidateProperty(userId.Value, 0),
			"Id must be greater than zero."
		);
	}
}

public sealed class Todo : ITodoRequest
{
	public required TodoId TodoId { get; init; }
	public required string Name { get; init; }
	public required string? Comment { get; init; }
	public required TodoStatus TodoStatus { get; init; }
	public required TodoPriority TodoPriority { get; init; }
	public required UserId UserId { get; init; }
}