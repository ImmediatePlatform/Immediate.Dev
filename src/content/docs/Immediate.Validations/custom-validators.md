---
title: Building custom validators
description: Write your own validator attribute — the contract, the analyzer rules, and TargetType.
order: 6
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

A custom validator is an attribute deriving from `ValidatorAttribute`. The generator discovers it
by inheritance, and a set of analyzers enforces the shape it must have — none of the contract is
expressed in the type system, so the diagnostics are the specification.

## The simplest validator

```csharp title="DivisibleByAttribute.cs"
using Immediate.Validations.Shared;

public sealed class DivisibleByAttribute(int divisor) : ValidatorAttribute
{
	public static bool ValidateProperty(int target, int divisor) =>
		divisor != 0 && target % divisor == 0;

	public static string DefaultMessage =>
		"'{PropertyName}' must be divisible by {DivisorValue}.";
}
```

```csharp title="Query.cs"
[Validate]
public sealed partial record Query : IValidationTarget<Query>
{
	[DivisibleBy(5)]
	public required int Quantity { get; init; }
}
```

<Callout type="note">

The primary constructor parameter is never read — the value reaches `ValidateProperty` through
generated code, not through a field. That would normally produce **CS9113** ("parameter is
unread") and **CA1019** ("define accessors for attribute arguments"); the package's
`UnusedConstructorParameterSuppressor` suppresses both on any type deriving from
`ValidatorAttribute`, so you can leave the parameter as-is.

</Callout>

## The contract

**Derive from `ValidatorAttribute`, with at most one non-static constructor.** Two or more
constructors is **IV0009**. A parameterless validator simply has no constructor.

**Declare exactly one `public static bool ValidateProperty` method.** The name is fixed and the
return type must be exactly `bool` — `true` means valid.

- No such method: **IV0001** (code fix available).
- Present but not `static`: **IV0002** (code fix available).
- More than one: **IV0003**.
- Wrong return type: **IV0004** (code fix available).

The **first parameter** is the value being validated. Its type determines which properties the
validator can be applied to; a mismatch is reported as **IV0014** and the attribute is silently
ignored at generation time. The method may be generic, in which case the generic constraints are
what must be satisfied:

```csharp
// applies to any property type
public static bool ValidateProperty<T>(T value) => …

// applies to enum-typed properties only
public static bool ValidateProperty<T>(T value) where T : struct, Enum => …

// applies to string properties only
public static bool ValidateProperty(string target) => …
```

**Declare a `DefaultMessage`.** Either a `public static string` property or a
`public const string` field, named exactly `DefaultMessage`. Missing it is **IV0010**, and it
would also fail at runtime, because `AdditionalValidations` reads it reflectively.

**Every configurable value must appear twice**, once as an attribute constructor parameter or
settable property, and once as a `ValidateProperty` parameter with a matching name. Matching is
**case-insensitive**, so a constructor parameter `divisor` pairs with a `ValidateProperty`
parameter `divisor` and with a property `Divisor` alike.

- Attribute member with no matching parameter: **IV0005**.
- Parameter with no matching attribute member: **IV0006**.
- Types that are not assignable: **IV0007**.
- A `ValidateProperty` parameter with no default value whose attribute member is not `required`
  (or, for a constructor parameter, has a default): **IV0008**.

The inherited `Message` property is exempt from all of this.

## Values from properties instead of constructor parameters

Constructor parameters and init-only properties can be mixed freely. Anything the
`ValidateProperty` parameter does not default must be `required`:

```csharp title="BetweenAttribute.cs"
public sealed class BetweenAttribute(int minimum) : ValidatorAttribute
{
	public required int Maximum { get; init; }

	public static bool ValidateProperty(int target, int minimum, int maximum) =>
		target >= minimum && target <= maximum;

	public static string DefaultMessage =>
		"'{PropertyName}' must be between {MinimumValue} and {MaximumValue}.";
}
```

```csharp
[Between(1, Maximum = 10)]
public required int Quantity { get; init; }
```

A `ValidateProperty` parameter with a default value makes the corresponding attribute member
optional.

## `[TargetType]`

Comparison validators need to accept a value of the same type as the property they are applied
to, but attribute parameters cannot be generic. `[TargetType]` on an `object`, `string`,
`object[]` or `string[]` parameter or property is the escape hatch: it tells the generator and
analyzer to type-check the supplied value against the corresponding `ValidateProperty` parameter
type, resolving a generic parameter to the validated property's actual type.

```csharp title="NotEqualToAttribute.cs"
public sealed class NotEqualToAttribute(
	[TargetType] object comparison
) : ValidatorAttribute
{
	public static bool ValidateProperty<T>(T target, T comparison) =>
		!EqualityComparer<T>.Default.Equals(target, comparison);

	public static string DefaultMessage =>
		"'{PropertyName}' must not be '{ComparisonValue}'.";
}
```

`[TargetType]` does two things:

1. It relaxes the **IV0007** type check for that member — `object` is allowed to stand in for `T`.
2. It enables `nameof(...)` resolution. A `nameof(SomeProperty)` argument is emitted as a real
   member access on the instance being validated rather than as the string `"SomeProperty"`.
   A reference whose type does not fit the target is **IV0015**; one that does not resolve to a
   usable member is **IV0017**.

<Callout type="warning">

`nameof(...)` is only resolved for **constructor parameters** marked `[TargetType]`. A
`nameof(...)` assigned to a `[TargetType]` init-only _property_ is emitted as its literal
string constant, even though the analyzer type-checks it as a member reference. Take anything
that callers may want to reference by `nameof` as a constructor parameter.

</Callout>

A `params` constructor parameter maps to a `params` array parameter on `ValidateProperty`; this
is how `OneOf` accepts a variable list of comparison values:

```csharp
public sealed class OneOfAttribute(
	[TargetType] params object[] values
) : ValidatorAttribute
{
	public static bool ValidateProperty<T>(T value, params T[] values) =>
		values.Contains(value);

	public static string DefaultMessage =>
		"'{PropertyName}' was not one of: {ValuesValue}.";
}
```

Array-valued parameters are rendered into messages as their elements joined with `", "`.

## Validating null values

By default a property that is `null` fails its null check and the remaining validators never run.
If your validator needs to see `null` — to treat it as valid, or to produce a different message —
declare the first parameter as nullable:

```csharp
public static bool ValidateProperty(string? target) => …
```

The generator then runs the validator _before_ the null check, against the raw value.

## Message tokens

Your `DefaultMessage` — and any `Message` override — can use `{PropertyName}`, `{PropertyValue}`,
and `{XxxValue}` / `{XxxName}` for each `ValidateProperty` parameter `xxx`, PascalCased. See
[Custom validation messages](/docs/Immediate.Validations/custom-messages).

To make your validator's default message localizable, read it from the configured localizer, the
way the built-ins do:

```csharp
public static string DefaultMessage =>
	ValidationConfiguration.Localizer[nameof(DivisibleByAttribute)].Value;
```

See [Localization](/docs/Immediate.Validations/localization).
