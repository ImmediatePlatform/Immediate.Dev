---
title: Additional validations
description: Write imperative validation logic on the type itself with an AdditionalValidations method.
order: 5
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

When attributes cannot express a rule — a check that depends on two properties, a conditional
rule, anything that needs a `switch` — add an `AdditionalValidations` method to the type. The
generator calls it at the end of that type's validation.

The signature is fixed:

```csharp
private static void AdditionalValidations(ValidationResult errors, TSelf target)
```

It must be `static`, return `void`, be non-generic, and take exactly a `ValidationResult`
followed by the containing type. The accessibility is up to you — `private` is conventional,
since only the generated partial calls it. If the signature does not match exactly, the method is
silently not called, so copy it carefully.

<Callout type="tip">

Put the caret on the type name and open the refactorings menu
(<kbd>Ctrl</kbd>+<kbd>.</kbd> / <kbd>Alt</kbd>+<kbd>Enter</kbd>):
**Add AdditionalValidations Method** scaffolds the method with the right signature. It is
offered on any `[Validate]` type that does not already have one.

</Callout>

## Reusing a validator's message

`ValidationResult.Add` accepts an expression of the form
`() => SomeAttribute.ValidateProperty(value, …)`. The expression is evaluated; if it returns
`false`, an error is added using that validator's default message, templated exactly as it would
have been had you applied the attribute.

```csharp title="Query.cs"
[Validate]
public sealed partial record Query : IValidationTarget<Query>
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
			errors.Add(
				() => GreaterThanAttribute.ValidateProperty(
					target.Id,
					0
				)
			);
		}
	}
}
```

If `Id` is `0`, this records `PropertyName` of `Id` and the message
`'Id' must be greater than '0'.` — the property path and display name are both derived from the
expression.

Pass a second argument to override the message:

```csharp
errors.Add(
	() => GreaterThanAttribute.ValidateProperty(target.Id, 0),
	"'{PropertyName}' is required when the query is enabled."
);
```

<Callout type="warning">

The expression must be exactly a call to a `public static bool ValidateProperty` method on a
type deriving from `ValidatorAttribute`, with the validated value as its first argument. Any
other shape throws `NotSupportedException("Invalid Validation Expression")` at runtime — this
is checked when the expression is evaluated, not by an analyzer.

</Callout>

The first argument may be a member access, an indexer or array access, or a chain of them; the
error's `PropertyName` follows the same
[path rules](/docs/Immediate.Validations/nested-and-collection-validation#property-path-rules) as
generated validation. The remaining arguments can be any expression at all — constants, locals,
method calls, conditionals.

## Adding an error directly

For anything that does not map onto an existing validator, construct a `ValidationError`:

```csharp title="Range.cs"
[Validate]
public sealed partial record Range : IValidationTarget<Range>
{
	public required DateOnly Start { get; init; }
	public required DateOnly End { get; init; }

	private static void AdditionalValidations(
		ValidationResult errors,
		Range target
	)
	{
		if (target.Start > target.End)
		{
			errors.Add(
				new ValidationError
				{
					PropertyName = nameof(Start),
					ErrorMessage = "'Start' must not be after 'End'.",
				}
			);
		}
	}
}
```

There is also a templating overload that takes the property name, a message template and a
dictionary of token values:

```csharp
errors.Add(
	nameof(Start),
	"'{PropertyName}' must not be after {EndValue:d}.",
	new Dictionary<string, object?>
	{
		["PropertyName"] = "Start",
		["EndValue"] = target.End,
	}
);
```

You supply the whole dictionary here, so you decide which tokens exist. Unknown tokens are left
in place, as always.

## Inheritance

Each level of an inheritance chain may declare its own `AdditionalValidations`. Because the
method is `private static` and matched by signature rather than overridden, the base type's
method runs as part of the base type's generated `Validate`, and the derived type's runs as part
of its own. Both fire when you validate the derived type.

`[Validate(SkipSelf = true)]` skips the type's own `AdditionalValidations` along with its
property validators; the base type's still runs.
