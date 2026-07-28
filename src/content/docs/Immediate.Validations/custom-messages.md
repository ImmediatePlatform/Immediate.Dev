---
title: Custom validation messages
description: Override the wording of any validator with the Message property, and template it with tokens.
order: 4
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Every validator attribute inherits a `Message` property from `ValidatorAttribute`. Set it to
replace that validator's default message. The value is a template: tokens wrapped in braces are
substituted before the error is recorded.

```csharp title="Query.cs"
[Validate]
public sealed partial record Query : IValidationTarget<Query>
{
	[GreaterThan(0, Message = "'{PropertyName}' must be a positive id, but was {PropertyValue}.")]
	public required int Id { get; init; }
}
```

## Available tokens

| Token             | Value                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `{PropertyName}`  | The display name of the validated property                                                             |
| `{PropertyValue}` | The value that failed validation                                                                       |
| `{XxxValue}`      | The value supplied for the validator parameter `xxx`                                                   |
| `{XxxName}`       | The display name of the member referenced by `nameof(...)` for parameter `xxx`, or empty for a literal |

`Xxx` is the validator's `ValidateProperty` parameter name in PascalCase. `GreaterThan` takes a
parameter called `comparison`, so its value is `{ComparisonValue}` and the name of a referenced
member is `{ComparisonName}`. `Length` takes `minLength` and `maxLength`, giving
`{MinLengthValue}` and `{MaxLengthValue}`. The
[built-in validators reference](/docs/Immediate.Validations/built-in-validators) lists the
parameter names for each attribute.

```csharp title="Query.cs"
[Validate]
public sealed partial record Query : IValidationTarget<Query>
{
	public required int Minimum { get; init; }

	[GreaterThan(nameof(Minimum), Message = "'{PropertyName}' must exceed '{ComparisonName}' ({ComparisonValue}).")]
	public required int Maximum { get; init; }
}
```

With `Minimum` of `10`, that renders as `'Maximum' must exceed 'Minimum' (10).`

<Callout type="note">

Tokens in an attribute `Message` are matched **case-sensitively**. `{propertyname}` will not
resolve. Messages added through `errors.Add(() => ...)` in an
[`AdditionalValidations`](/docs/Immediate.Validations/additional-validations) method are matched
case-insensitively.

</Callout>

## Format specifiers

A token may carry a standard .NET format string after a colon, which is applied via
`string.Format`:

```csharp title="Query.cs"
[Validate]
public sealed partial record Query : IValidationTarget<Query>
{
	[LessThan(0.0d, Message = "{PropertyValue:N2}")]
	public required double Value { get; init; }
}
```

A `Value` of `1.2345` renders `1.23`.

## Unknown tokens are left alone

An unrecognised token is emitted verbatim rather than throwing or being blanked out. A message of
`"{Invalid}"` produces the literal error message `{Invalid}`. This is convenient when a message
legitimately contains braces, but it also means a typo'd token is silent — check your rendered
messages.

## Display names

`{PropertyName}` renders a _display name_, not the C# identifier. The default is the identifier
with a space inserted before each capital letter that follows a non-capital, so `StringValue`
becomes `String Value` and `Id` stays `Id`. Collection indexes are appended:
`String Property[0]`.

Override it with `[Description]` from `System.ComponentModel`:

```csharp title="Query.cs"
using System.ComponentModel;

[Validate]
public sealed partial record Query : IValidationTarget<Query>
{
	[Description("Customer number")]
	[GreaterThan(0)]
	public required int CustomerNumber { get; init; }
}
```

That renders `'Customer number' must be greater than '0'.`

<Callout type="note">

A `[Description]` with no argument, or with an empty or whitespace-only string, is ignored and
the humanized identifier is used instead.

</Callout>

`[Description]` also applies to members referenced by `nameof(...)`, so `{ComparisonName}` picks
up the description of the member it points at.

## How referenced members are named

For attribute-based validation, `{XxxName}` resolves as follows:

- **Property or field** — its `[Description]`, else its humanized name.
- **Method** — the method name followed by `()`, for example `AllDigitsRegex()`.
- **Literal argument** — the empty string.

Inside an `AdditionalValidations` method, the name is derived from the expression you wrote, so
richer shapes are supported: nested member chains render as `Parent.Child`, array and indexer
accesses as `Parent[0]` or `Parent[123]`, and parameterless method calls as `Method()` or
`Parent.Method()`.

<Callout type="warning">

`ValidationError.PropertyName` — the key you would group errors by — is **not** the display
name. It is the property path (`Addresses[2].Street`). See
[Nested and collection validation](/docs/Immediate.Validations/nested-and-collection-validation#property-path-rules).

</Callout>

## Changing the defaults globally

To change a validator's message everywhere rather than per-property, replace the message
catalogue instead — see [Localization](/docs/Immediate.Validations/localization).
