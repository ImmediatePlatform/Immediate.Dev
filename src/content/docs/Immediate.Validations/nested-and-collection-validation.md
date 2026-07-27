---
title: Nested and collection validation
description: How child objects and collections are walked, and exactly how error property paths are named.
order: 3
group: Guides
sidebar:
  label: Nested and collections
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Validation recurses. A property whose type is itself marked `[Validate]` is validated as part of
its parent, and collections are walked element by element, to arbitrary depth.

## Nested validation targets

```csharp title="Command.cs"
[Validate]
public sealed partial record Command : IValidationTarget<Command>
{
	public required Address Address { get; init; }
}

[Validate]
public sealed partial record Address : IValidationTarget<Address>
{
	[NotEmpty]
	public required string Street { get; init; }
}
```

Validating a `Command` whose `Address.Street` is empty produces a single error with
`PropertyName` of `Address.Street` — the child's own path, prefixed with the parent property.
Nothing needs to be declared to enable this; it follows from `Address` carrying `[Validate]`.

A nullable nested target that is `null` is simply skipped. A non-nullable one that is `null`
fails its implicit null check and is not recursed into.

## Collections

Properties typed as an **array**, `ICollection<T>`, `IReadOnlyCollection<T>`, or anything
implementing one of those interfaces (`List<T>`, `IReadOnlyList<T>`, `HashSet<T>`, …) are walked
element by element.

```csharp title="Command.cs"
[Validate]
public sealed partial record Command : IValidationTarget<Command>
{
	public required IReadOnlyList<Address> Addresses { get; init; }
}
```

Each element is validated in turn, and errors carry an index: `Addresses[2].Street`. Nested
collections nest their indexes: `Matrix[0][1]`.

<Callout type="warning" title="IEnumerable is deliberately not walked">

`IEnumerable<T>` is **not** treated as a collection, because validating it would enumerate a
sequence that may only be enumerable once — or may be an unmaterialised query. Change the
property type to `IReadOnlyList<T>`, `ICollection<T>` or an array to opt in.

</Callout>

## Validating elements instead of the collection

An untargeted validator attribute on a collection property applies to **the collection itself**,
and to every nested collection level. To validate the _elements_, use the `element:` attribute
target.

```csharp title="Command.cs"
[Validate]
public sealed partial record Command : IValidationTarget<Command>
{
	// `Tags` itself must be non-empty; individual tags are unconstrained
	[NotEmpty]
	public required IReadOnlyList<string> Tags { get; init; }

	// each individual name must be non-empty; the list itself is unconstrained
	[element: NotEmpty]
	public required IReadOnlyList<string> Names { get; init; }
}
```

`element:` always targets the **innermost** element type. On
`IReadOnlyList<IReadOnlyList<string>>`, `[element: NotEmpty]` applies to each `string`, while a
plain `[NotEmpty]` applies to the outer list _and_ to each inner list.

<Callout type="note" title="Why the compiler does not complain">

`element` is not a C# attribute target, so the compiler would normally emit **CS0658**
("`element` is not a recognized attribute location"). Immediate.Validations ships an
`InvalidAttributeTargetSuppressor` that suppresses CS0658 specifically for `element:` on a
collection-typed property or record parameter inside a `[Validate]` type. The attribute is
otherwise ignored by the compiler, which is what makes the trick work.

</Callout>

On a positional record, combine the two targets:

```csharp title="Command.cs"
[Validate]
public sealed partial record Command(
	[property: NotEmpty]
	[element: GreaterThan(0)]
	IReadOnlyList<int> Values
) : IValidationTarget<Command>;
```

## Interfaces, base classes, and visit deduplication

Base classes and `[Validate]` interfaces contribute their validators to the derived type. Because
a type can reach the same interface by more than one path, the shared `ValidationResult` tracks
which types it has already visited and short-circuits repeats:

```csharp title="Interfaces.cs"
[Validate]
public partial interface IBase : IValidationTarget<IBase>;

[Validate]
public partial interface ISub : IBase, IValidationTarget<ISub>;

[Validate]
public sealed partial record Command : IBase, ISub, IValidationTarget<Command>;
```

`IBase`'s validators run **once**, not twice.

<Callout type="note">

Deduplication is scoped to a single `ValidationResult`. Nested property targets are validated
with a fresh result before their errors are re-prefixed and merged, so the same type appearing
as two different properties is validated twice — which is what you want.

</Callout>

## Property path rules

`ValidationError.PropertyName` is the machine-readable path, built from these rules. If you are
mapping errors onto form fields, this is the contract.

| Situation                                        | `PropertyName`           |
| ------------------------------------------------ | ------------------------ |
| Property on the validated type                   | `Street`                 |
| Property of a nested `[Validate]` type           | `Address.Street`         |
| Element of a collection                          | `Addresses[2]`           |
| Property of a collection element                 | `Addresses[2].Street`    |
| Nested collections                               | `Matrix[0][1]`           |
| Property inherited from a base type or interface | `BaseString` (no prefix) |
| The root target itself was `null`                | `.self`                  |

The `.self` sentinel is used when a reference-typed target passed to `Validate` is `null`. The
result contains exactly one error:

```text
PropertyName  = ".self"
ErrorMessage  = "`target` must not be `null`."
```

<Callout type="warning">

Two things about the root-null case are worth knowing. First, that message is a hard-coded
literal — it is **not** run through the localizer. Second, `Validate(null, existingErrors)`
returns a **new** `ValidationResult` containing only the `.self` error; the `ValidationResult`
you passed in is not modified and is not returned. Value-type targets cannot be `null`, so
`.self` never appears for them.

</Callout>

### Display names are separate

`PropertyName` is the path; the `{PropertyName}` token _inside a message_ is a human-readable
display name and follows different rules — it is the property identifier with a space inserted
before each capital that follows a non-capital (`StringValue` → `String Value`), or the value of
`[Description]` if present, with any `[index]` suffixes appended. Display names are **not**
prefixed with the parent path, so a failure at `Addresses[2].Street` reads
`'Street' must not be empty.` while its `PropertyName` is `Addresses[2].Street`.

See [Custom validation messages](/docs/Immediate.Validations/custom-messages) for the full token
list, and [Handling validation failures](/docs/Immediate.Validations/handling-failures) for
turning these paths into a `ValidationProblemDetails`.
