---
title: Built-in validators
description: All fifteen validator attributes, with constructor signatures, applicable types and default messages.
order: 11
group: Reference
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Every validator lives in `Immediate.Validations.Shared` and derives from `ValidatorAttribute`, so
all of them accept a `Message` property to override the default text. "Applies to" is decided by
the first parameter of the validator's `ValidateProperty` method: applying one to an incompatible
property type produces **IV0014** and the validator is silently dropped from generation.

| Validator                                   | Constructor                                        | Applies to | Default message                                                                      |
| ------------------------------------------- | -------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| [`Empty`](#empty)                           | `Empty()`                                          | any type   | `'{PropertyName}' must be empty.`                                                    |
| [`NotEmpty`](#notempty)                     | `NotEmpty()`                                       | any type   | `'{PropertyName}' must not be empty.`                                                |
| [`NotNull`](#notnull)                       | `NotNull()`                                        | any type   | `'{PropertyName}' must not be null.`                                                 |
| [`Equal`](#equal)                           | `Equal(object comparison)`                         | any type   | `'{PropertyName}' must be equal to '{ComparisonValue}'.`                             |
| [`NotEqual`](#notequal)                     | `NotEqual(object comparison)`                      | any type   | `'{PropertyName}' must not be equal to '{ComparisonValue}'.`                         |
| [`GreaterThan`](#greaterthan)               | `GreaterThan(object comparison)`                   | any type   | `'{PropertyName}' must be greater than '{ComparisonValue}'.`                         |
| [`GreaterThanOrEqual`](#greaterthanorequal) | `GreaterThanOrEqual(object comparison)`            | any type   | `'{PropertyName}' must be greater than or equal to '{ComparisonValue}'.`             |
| [`LessThan`](#lessthan)                     | `LessThan(object comparison)`                      | any type   | `'{PropertyName}' must be less than '{ComparisonValue}'.`                            |
| [`LessThanOrEqual`](#lessthanorequal)       | `LessThanOrEqual(object comparison)`               | any type   | `'{PropertyName}' must be less than or equal to '{ComparisonValue}'.`                |
| [`Length`](#length)                         | `Length(object minLength, object maxLength)`       | `string`   | `'{PropertyName}' must be between {MinLengthValue} and {MaxLengthValue} characters.` |
| [`MinLength`](#minlength)                   | `MinLength(object minLength)`                      | `string`   | `'{PropertyName}' must be more than {MinLengthValue} characters.`                    |
| [`MaxLength`](#maxlength)                   | `MaxLength(object maxLength)`                      | `string`   | `'{PropertyName}' must be less than {MaxLengthValue} characters.`                    |
| [`Match`](#match)                           | `Match(object? expr = null, object? regex = null)` | `string`   | `'{PropertyName}' is not in the correct format.`                                     |
| [`EnumValue`](#enumvalue)                   | `EnumValue()`                                      | any `enum` | `'{PropertyName}' has a range of values which does not include '{PropertyValue}'.`   |
| [`OneOf`](#oneof)                           | `OneOf(params object[] values)`                    | any type   | `'{PropertyName}' was not one of the specified values: {ValuesValue}.`               |

<Callout type="note">

Every parameter above is declared `object` and marked `[TargetType]`, which is how an attribute
accepts a value of the same type as the property it decorates. The value you supply must match
the type the validator actually compares against — the property's own type for the comparison
validators, `int` for the length validators, `string` or `Regex` for `Match`. A mismatch is
**IV0015**. You may also pass `nameof(SomeMember)` to compare against another member; see
[Referencing other members](/docs/Immediate.Validations/creating-validators#referencing-other-members).

</Callout>

<Callout type="tip" title="Two of these are applied for you">

`NotNull` is applied automatically to every non-nullable reference-typed property, and
`EnumValue` to every enum-typed property. You only write them explicitly to override the
default behaviour.

</Callout>

## Validator reference

### Empty

Passes when the value is "empty": `null`, a `string` that is null, empty or whitespace, an
`ICollection` with a `Count` of zero, or any other value equal to `default(T)` — so `0` for
`int`, `default` for a struct.

```csharp
[Validate]
public sealed partial record Query : IValidationTarget<Query>
{
	[Empty]
	public required string? MustBeBlank { get; init; }
}
```

### NotEmpty

The exact negation of `Empty`. Note that on an `int` this rejects `0`, and on a `string` it
rejects `"   "` as well as `""`.

```csharp
[NotEmpty]
public required string Name { get; init; }
```

Applied to a collection, an untargeted `[NotEmpty]` requires the _collection_ to be non-empty;
`[element: NotEmpty]` requires each element to be. See
[Nested and collection validation](/docs/Immediate.Validations/nested-and-collection-validation#validating-elements-instead-of-the-collection).

### NotNull

Passes when the value is not `null`.

```csharp
// only needed on a nullable property — non-nullable ones get this implicitly
[NotNull]
public required string? MustBePresent { get; init; }
```

<Callout type="warning">

`[NotNull]` on a non-nullable value type can never fail, and is reported as **IV0018**.

</Callout>

### Equal

Compares with `EqualityComparer<T>.Default`.

```csharp
[Equal(42)]
public required int Answer { get; init; }

public required string Password { get; init; }

[Equal(nameof(Password))]
public required string ConfirmPassword { get; init; }
```

### NotEqual

The negation of `Equal`, also using `EqualityComparer<T>.Default`.

```csharp
[NotEqual(0)]
public required int Delta { get; init; }
```

### GreaterThan

Uses `Comparer<T>.Default`; passes when the comparison result is greater than zero. Any type with
a default comparer works — numbers, `DateTime`, `string` (ordinal-ish culture comparison),
anything implementing `IComparable<T>`.

```csharp
[GreaterThan(0)]
public required int Id { get; init; }
```

### GreaterThanOrEqual

As `GreaterThan`, but the comparison result may also be zero.

```csharp
[GreaterThanOrEqual(0)]
public required decimal Balance { get; init; }
```

### LessThan

Uses `Comparer<T>.Default`; passes when the comparison result is less than zero.

```csharp
public required int Maximum { get; init; }

[LessThan(nameof(Maximum))]
public required int Minimum { get; init; }
```

### LessThanOrEqual

As `LessThan`, but the comparison result may also be zero.

```csharp
[LessThanOrEqual(100)]
public required int Percentage { get; init; }
```

### Length

**Strings only.** Passes when `target.Length` is between `minLength` and `maxLength`,
**inclusive** at both ends. Both arguments must be `int`.

```csharp
[Length(2, 50)]
public required string Name { get; init; }
```

### MinLength

**Strings only.** Passes when `target.Length >= minLength` — the bound is inclusive, despite the
default message reading "must be more than".

```csharp
[MinLength(8)]
public required string Password { get; init; }
```

### MaxLength

**Strings only.** Passes when `target.Length <= maxLength` — again inclusive, despite the default
message reading "must be less than".

```csharp
[MaxLength(50)]
public required string Name { get; init; }
```

### Match

**Strings only.** Takes either a regex pattern string or a `Regex` instance. The first positional
argument is `expr`; pass a `Regex` by name.

```csharp
// pattern string — compiled on each call with a 1 second match timeout
[Match(@"^\d+$")]
public required string DigitsOnly { get; init; }
```

```csharp
// a source-generated Regex, referenced by nameof
[GeneratedRegex(@"^\d+$")]
private static partial Regex AllDigitsRegex();

[Match(regex: nameof(AllDigitsRegex))]
public required string Id { get; init; }
```

<Callout type="warning">

`Match` with neither argument compiles cleanly and throws `ArgumentException` — "Both `regex`
and `expr` are `null`. At least one must be provided." — at validation time. The `Regex`
overload also avoids re-parsing the pattern on every validation, so prefer it on hot paths.

</Callout>

### EnumValue

**Enums only** (and nullable enums). Passes when `Enum.IsDefined` returns `true`. For an enum
marked `[Flags]`, a value that is not itself a declared member still passes when every set bit is
covered by the union of all declared members.

```csharp
public enum Status { None = 0, Active, Archived }

[Flags]
public enum Permissions { None = 0, Read = 1, Write = 2 }

[Validate]
public sealed partial record Query : IValidationTarget<Query>
{
	// [EnumValue] is implicit — (Status)42 fails
	public required Status Status { get; init; }

	// Read | Write passes; (Permissions)4 fails
	public required Permissions Permissions { get; init; }
}
```

<Callout type="note">

Flags checking is only supported for enums whose underlying type is an integral type or `char`;
anything else throws `NotSupportedException`. All the standard underlying types qualify.

</Callout>

### OneOf

Passes when the value equals one of the supplied values, compared with the default equality
comparer. Accepts a variable number of arguments, or a `nameof` reference to an array-typed
member.

```csharp
[OneOf("red", "green", "blue")]
public required string Colour { get; init; }
```

```csharp
private static readonly string[] s_allowed = ["red", "green", "blue"];

[OneOf(nameof(s_allowed))]
public required string Colour { get; init; }
```

The values are rendered into `{ValuesValue}` joined with `", "`.
