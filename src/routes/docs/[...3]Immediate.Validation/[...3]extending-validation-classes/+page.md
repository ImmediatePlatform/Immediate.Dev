---
title: Extending validation classes
description: Learn how to extend validation classes with custom validation logic
---

# {$frontmatter.title}

If attributes are not enough to specify how to validate a class, an AdditionalValidations method can be used to write additional validations for the class.

```cs |copy|title=Query.cs
[Validate]
public partial record Query : IValidationTarget<Query>
{
	public required bool Enabled { get; init; }
	public required int Id { get; init; }

	private static void AdditionalValidations(
		ValidationResult errors,
		Query target
	)
	{
		if (target.Enabled)
		{
			// Use a lambda to use the default message or override message;
			// the message will be templated in the same way as attribute validations.
			errors.Add(
				() => GreaterThanAttribute.ValidateProperty(
					target.Id,
					0
				)
			);
		}

		if (false)
		{
			// Manually create a `ValidationError` and add it to the `ValidationResult`.
			errors.Add(
				new ValidationError()
				{
					PropertyName = "ExampleProperty",
					ErrorMessage = "Example Message",
				}
			)
		}
	}
}
```
