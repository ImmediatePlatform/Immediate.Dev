---
title: Creating validators
description: Learn how to create validators
---

# {$frontmatter.title}

In order to use Immediate.Validations, it must be added to the Immediate.Handlers behaviors pipeline by including it in the list of default Behaviors for the assembly:

```cs |copy|title=AssemblyAttributes.cs
using Immediate.Validations.Shared;

[assembly: Behaviors(
	typeof(ValidationBehavior<,>)
)]
```

To indicate that a class should be validated add the `[Validate]` attribute and an `IValidationTarget<>` interface:

```cs |copy|title=Query.cs
[Validate]
public partial record Query : IValidationTarget<Query>;
```

When [Nullable Reference Types](https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references) are enabled, any non-nullable reference types are automatically checked for a `null` value. Other validations are available like so:

```cs |copy|title=Query.cs
[Validate]
public partial record Query : IValidationTarget<Query>
{
	[GreaterThan(0)]
	public required int Id { get; init; }
}
```

## Referencing Other Properties

Since attributes cannot reference anything other than constant strings, the way to reference static and instance properties, fields, and methods is to use the nameof() to identify which property, field, or method should be used. For example:

```cs |copy|title=Query.cs
[Validate]
public partial record Query : IValidationTarget<Query>
{
	[GeneratedRegex(@"^\d+$")]
	private static partial Regex AllDigitsRegex();

	[Match(regex: nameof(AllDigitsRegex))]
	public required string Id { get; init; }
}
```

## Collections

Properties of type `ICollection<>` and `IReadOnlyCollection<>` are validated. In order to avoid multiple enumerations of non-collection sequences, properties of type `IEnumerable<>` are not. For example:

```cs |copy|title=Query.cs
[Validate]
public partial record Query : IValidationTarget<Query>
{
	[Validate]
	public partial record Person : IValidationTarget<Person>
	{
		[MaxLength(50)]
		public required string FirstName { get; init; }

		[MaxLength(50)]
		public required string LastName { get; init; }
	}

	// not validated
	public required IEnumerable<Person> People { get; init; }

	// validated
	public required ICollection<Person> CollectionPeople { get; init; }
}
```
