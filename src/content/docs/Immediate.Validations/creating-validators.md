---
title: Creating validators
description: Mark a type with Validate, implement IValidationTarget, and let the generator write the checks.
order: 2
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

A validation target is any `partial` type marked `[Validate]` that declares
`IValidationTarget<TSelf>`. The generator supplies the implementation.

```csharp title="Query.cs"
using Immediate.Validations.Shared;

[Validate]
public sealed partial record Query : IValidationTarget<Query>
{
	[GreaterThan(0)]
	public required int Id { get; init; }
}
```

`[Validate]` may be applied to a **class, struct, record, record struct or interface**. Records
and record structs are classes and structs as far as the attribute is concerned, so all five
work. Nested types are supported; every enclosing type must also be declared `partial`.

<Callout type="note">

Declaring `IValidationTarget<T>` is what makes the type usable by
`ValidationBehavior<,>` and by `ValidationException.ThrowIfInvalid`. Omitting it produces
**IV0013** (warning), which ships with a code fix that adds the interface for you. Applying a
validator attribute without `[Validate]` produces **IV0012** (error), also with a code fix.

</Callout>

## Which properties are validated

The generator considers **public, non-static, settable instance properties** declared on the
type itself:

- `private`, `protected` and `internal` properties are skipped.
- `static` properties are skipped.
- Get-only properties (including expression-bodied computed properties) are skipped, because
  they have no setter — _except_ on interfaces, where every public property is considered.
- Inherited properties are not re-validated here; they are covered by the base type's own
  generated validator (see [composition](#inheritance-and-interfaces)).
- The compiler-generated record `EqualityContract` is ignored.

For positional records, attributes must carry an explicit `property:` target — a bare attribute
on a primary constructor parameter targets the _parameter_, which validator attributes do not
allow:

```csharp title="Query.cs"
[Validate]
public sealed partial record Query(
	[property: MaxLength(50)] string Name,
	[property: NotEmpty] IReadOnlyList<int> Ids
) : IValidationTarget<Query>;
```

## Automatic null checks

With [nullable reference types](https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references)
enabled, every non-nullable reference-typed property gets an implicit `NotNull` check — you do
not write `[NotNull]` yourself. Nullable properties get no check unless you ask for one.

```csharp title="Query.cs"
[Validate]
public sealed partial record Query : IValidationTarget<Query>
{
	// implicitly checked for null
	public required string Name { get; init; }

	// not checked
	public required string? Nickname { get; init; }

	// explicitly checked, despite being nullable
	[NotNull]
	public required string? MustBePresent { get; init; }
}
```

To opt a non-nullable property out of the implicit check, annotate it with `[AllowNull]` from
`System.Diagnostics.CodeAnalysis`:

```csharp
using System.Diagnostics.CodeAnalysis;

[AllowNull]
public required string Optional { get; init; }
```

When a null check fails, that property's remaining validators are skipped — you get one
"must not be null" error rather than a cascade.

<Callout type="warning">

`[NotNull]` on a non-nullable **value** type (`int`, `DateTime`, an enum…) can never fail and
is reported as **IV0018**. Use `Nullable<T>` if the value is genuinely optional.

</Callout>

## Enums are validated automatically

Every property whose type is an enum — or a nullable enum — has `EnumValue` applied by the
generator. You never need to write `[EnumValue]`, and there is no way to turn it off short of
changing the property type.

```csharp title="Query.cs"
[Validate]
public sealed partial record Query : IValidationTarget<Query>
{
	// implicitly validated: (Status)42 produces an error
	public required Status Status { get; init; }
}
```

`[Flags]` enums are handled too — see
[`EnumValue`](/docs/Immediate.Validations/built-in-validators#enumvalue).

## Referencing other members

Attribute arguments must be compile-time constants, so a validator that needs to compare against
another property, field or method takes a `nameof(...)` reference instead. The generator resolves
it to a real member access in the emitted code.

```csharp title="Query.cs"
[Validate]
public sealed partial record Query : IValidationTarget<Query>
{
	[GeneratedRegex(@"^\d+$")]
	private static partial Regex AllDigitsRegex();

	[Match(regex: nameof(AllDigitsRegex))]
	public required string Id { get; init; }

	public required int Minimum { get; init; }

	[GreaterThan(nameof(Minimum))]
	public required int Maximum { get; init; }
}
```

Instance and static properties, fields and parameterless methods are all valid targets, on this
type or — for static members — on another type entirely. An unusable target is reported as
**IV0017** (error); a target whose type does not fit is **IV0015** (warning).

<Callout type="note">

`nameof(...)` is only resolved for validator constructor parameters marked `[TargetType]`. All
the built-in comparison validators mark theirs, so this works out of the box. See
[Building custom validators](/docs/Immediate.Validations/custom-validators) if you are writing
your own.

</Callout>

## Inheritance and interfaces

A `[Validate]` type that derives from another `[Validate]` type, or implements a `[Validate]`
interface, runs the base type's validators as well as its own. Each type in the graph is visited
at most once per validation run, so a diamond does not produce duplicate errors.

```csharp title="Commands.cs"
[Validate]
public partial record BaseCommand : IValidationTarget<BaseCommand>
{
	public required string BaseString { get; init; }
}

[Validate]
public sealed partial record SubCommand : BaseCommand, IValidationTarget<SubCommand>
{
	public required string SubString { get; init; }
}
```

Errors raised by base-type validators use the bare property name — they are not prefixed with
the base type's name.

## Skipping a type's own checks

`[Validate(SkipSelf = true)]` suppresses validation of the type's _own_ properties and its
`AdditionalValidations` method, while still running base-class and interface validators. It is
useful when a derived type re-declares properties that its base already covers.

```csharp title="SubClass.cs"
[Validate(SkipSelf = true)]
public sealed partial record SubClass : BaseClass, IValidationTarget<SubClass>
{
	// never validated
	public required string IgnoredString { get; init; }
}
```

Validating a `SubClass` still reports failures for `BaseClass.BaseString`.

## Next steps

- [Built-in validators](/docs/Immediate.Validations/built-in-validators) — the full attribute list.
- [Nested and collection validation](/docs/Immediate.Validations/nested-and-collection-validation) — child objects, collections and error paths.
- [Custom validation messages](/docs/Immediate.Validations/custom-messages) — overriding the wording.
