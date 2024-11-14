---
title: Custom validation messages
description: Learn how to add custom validation messages to your validations
---

# {$frontmatter.title}

A custom message can be provided to any validation using the `Message` property of a validation attribute. The message will be parsed for template parameters, which will be applied to the message before rendering to the validation result. The target property name is available as `{PropertyName}`, and its value via `{PropertyValue}`.

Other parameter values will be added using their property name suffixed with `Value` (for example, the `GreaterThanAttribute` uses a `comparison` parameter, so the value is available via `ComparisonValue`). If another property on the target class is referenced via `nameof(Property)`, the name of that property will be available using the `Name` suffix (for example, `ComparisonName` for the `comparison` property).

```cs |copy|title=Query.cs
[Validate]
public partial record Query : IValidationTarget<Query>
{
	[GreaterThan(0, Message = "'{PropertyName}' must be greater than '{ComparisonValue}'")]
	public required int Id { get; init; }
}
```
