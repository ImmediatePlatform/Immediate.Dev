---
title: How it works
description: What the generator emits for a Validate type, in what order it runs, and how error paths are built.
order: 13
group: Reference
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Validations is an incremental source generator plus four analyzers, five code fixes, a
refactoring and two diagnostic suppressors. Nothing about validation is decided at runtime: the
set of checks for a type, the order they run in, and the messages they produce are all fixed when
the project compiles. For the shared background on how these packages generate code, see
[How source generation works](/docs/concepts/source-generation).

## The pipeline

The generator hooks `ForAttributeWithMetadataName` on
`Immediate.Validations.Shared.ValidateAttribute`, restricted to type declarations. For each match
it builds an equatable model of the type — its namespace, enclosing types, kind, base validation
targets, whether it has an `AdditionalValidations` method, and one entry per validated property —
and renders that model through a Scriban template.

Output is added as `IV.<Namespace>.<OuterTypes>.<Type>.g.cs`. A type in namespace `Api.Users`
nested in `GetUser` emits `IV.Api.Users.GetUser.Query.g.cs`; a top-level type in the global
namespace emits `IV...Query.g.cs`, empty segments and all.

Because the model is equatable, editing an unrelated file does not re-render your validators.

## What gets emitted

For a class, struct or record, the generated partial declares
`global::Immediate.Validations.Shared.IValidationTarget` and contains:

- Explicit implementations of `IValidationTarget.Validate()` and
  `IValidationTarget.Validate(ValidationResult)`.
- Explicit implementations of the two static abstract `IValidationTarget<T>.Validate` members.
- Public static `Validate(T? target)` and `Validate(T? target, ValidationResult errors)` — the
  methods you normally call.
- One `private static void __Validate<PropertyName>(…)` method per validated property, plus one
  extra method per level of collection nesting, suffixed with `0`, `00`, and so on.

Every generated member carries
`[GeneratedCode("Immediate.Validations", "<version>")]`. The file opens with `#nullable enable`
and suppresses CS1591 so that missing XML docs on generated members do not warn.

An `[Validate]` **interface** gets the static generic members only — it never declares the
non-generic `IValidationTarget`, and its `Validate` methods are declared `new` so that a type
implementing several validated interfaces still compiles.

Abridged, the shape looks like this:

```csharp title="IV...Query.g.cs"
partial record Query : global::Immediate.Validations.Shared.IValidationTarget
{
	public static global::Immediate.Validations.Shared.ValidationResult Validate(
		Query? target,
		global::Immediate.Validations.Shared.ValidationResult errors
	)
	{
		if (target is not { } t)
		{
			return new()
			{
				{ ".self", "`target` must not be `null`." },
			};
		}

		if (!errors.VisitType(typeof(Query)))
			return errors;

		__ValidateName(errors, t, t.Name);

		return errors;
	}

	private static void __ValidateName(
		global::Immediate.Validations.Shared.ValidationResult errors,
		Query instance,
		string target
	)
	{
		if (target is not { } t)
		{
			errors.Add(
				$"Name",
				global::Immediate.Validations.Shared.NotNullAttribute.DefaultMessage,
				new()
				{
					["PropertyName"] = $"Name",
					["PropertyValue"] = null,
				}
			);

			return;
		}

		{
			if (!global::Immediate.Validations.Shared.NotEmptyAttribute.ValidateProperty(t))
			{
				errors.Add(
					$"Name",
					global::Immediate.Validations.Shared.NotEmptyAttribute.DefaultMessage,
					new()
					{
						["PropertyName"] = $"Name",
						["PropertyValue"] = t,
					}
				);
			}
		}
	}
}
```

## Execution order

`Validate(target, errors)` runs in this order:

1. **Root null check.** For a reference type, a `null` target short-circuits to a brand-new
   `ValidationResult` containing only the `.self` error. Value types skip this step.
2. **Visit check.** `errors.VisitType(typeof(T))` returns `false` if this type has already
   contributed to this result, in which case validation returns immediately. This is what stops a
   diamond interface hierarchy validating twice.
3. **Base types and interfaces.** Each `[Validate]` base class and interface has its
   `Validate(t, errors)` called with the _same_ result, so their errors land unprefixed.
4. **Properties**, in declaration order, unless `SkipSelf` is set.
5. **`AdditionalValidations(errors, t)`**, if the type declares one and `SkipSelf` is not set.

Within a single property's `__Validate` method:

1. **Null-tolerant validators** run first, against the raw value. A validator is null-tolerant
   when its `ValidateProperty` first parameter is a nullable reference type or a `Nullable<T>`;
   none of the built-ins are.
2. **The null check.** If the value is `null`, the `NotNull` error is recorded (when the property
   requires one) and the method returns — nothing further runs for this property.
3. **Nested target recursion.** If the property type carries `[Validate]`, its `Validate` is
   called and each returned error is re-added with `PropertyName` prefixed by this property's
   path.
4. **Collection recursion.** If the property is an array, `ICollection<T>` or
   `IReadOnlyCollection<T>`, an index counter is opened and the next-deeper `__Validate` method is
   called per element.
5. **The remaining validators**, against the non-null value.

## How paths are built

The generated code carries two parallel strings for each property: the **path**, which becomes
`ValidationError.PropertyName`, and the **display name**, which becomes the `{PropertyName}`
token in the message.

- The path starts as the C# identifier. Each level of collection nesting appends
  `[{counterN}]`, interpolated at runtime from the loop counter.
- Nested `[Validate]` types are handled by re-writing the child's errors:
  `PropertyName = childPath is empty ? "Prop" : "Prop." + childPath`. Applying that at every
  level is what produces `Addresses[2].Street`.
- The display name starts as the humanized identifier — a space before each capital that follows
  a non-capital — or the value of `[Description]`. It gets the same `[index]` suffixes, but is
  never prefixed with a parent path, which is why a nested error reads `'Street' must not be
empty.` while its path is `Addresses[2].Street`.

Message tokens are substituted at the point of failure by `ValidationResult.Add`, from a
dictionary the generator populates with `PropertyName`, `PropertyValue`, and a
`XxxValue`/`XxxName` pair per validator argument.

<Callout type="note">

`VisitType` deduplication is per `ValidationResult`. Nested property targets are validated into
a fresh result before merging, so the same type used as two different properties is validated
twice — which is the desired behaviour.

</Callout>

## Where the behavior sits

`ValidationBehavior<TRequest, TResponse>` is an ordinary Immediate.Handlers `Behavior<,>`
constrained to `TRequest : IValidationTarget<TRequest>`. Immediate.Handlers only weaves a behavior
into a handler's pipeline when the constraints are satisfiable, so the behavior appears in
generated pipelines for validated requests and is absent everywhere else — there is no runtime
type test and no cost for handlers that do not validate. See
[Handlers and the behavior pipeline](/docs/concepts/handlers-and-behaviors).

## Analyzers, fixes and suppressors

Four analyzers ship alongside the generator: `ValidatorClassAnalyzer` (the custom validator
contract), `ValidateClassAnalyzer` (validation targets and attribute usage),
`AssemblyBehaviorAnalyzer` (the assembly behavior list), and two `DiagnosticSuppressor`s —
`InvalidAttributeTargetSuppressor` for the `element:` attribute target, and
`UnusedConstructorParameterSuppressor` for validator constructor parameters. All of them are
enumerated on the [Diagnostics](/docs/Immediate.Validations/diagnostics) page.

Analyzers, code fixes and the generator are shipped twice in the package: a Roslyn 4.8 build used
by `net8.0` and `net9.0`, and a Roslyn 5.0 build used by `net10.0` and `net11.0`.
