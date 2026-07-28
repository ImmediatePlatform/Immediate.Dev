---
title: API reference
description: The runtime types in Immediate.Validations.Shared — results, errors, exceptions, attributes and configuration.
order: 12
group: Reference
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Everything below lives in the `Immediate.Validations.Shared` namespace, shipped in
`Immediate.Validations.Shared.dll` as part of the `Immediate.Validations` package.

## ValidateAttribute

```csharp
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Interface)]
public sealed class ValidateAttribute : Attribute
{
	public bool SkipSelf { get; init; }
}
```

Marks a type for validation generation. `SkipSelf` skips the type's own property validators and
its `AdditionalValidations` method while still running base-class and interface validators.

## IValidationTarget

```csharp
public interface IValidationTarget
{
	ValidationResult Validate();
	ValidationResult Validate(ValidationResult errors);
}

public interface IValidationTarget<T>
{
	static abstract ValidationResult Validate(T? target);
	static abstract ValidationResult Validate(T? target, ValidationResult errors);
}
```

You declare `IValidationTarget<T>` on your type; the generator implements both interfaces. The
non-generic members are implemented explicitly, so call them through an `IValidationTarget`
reference. The generator also emits public static `Validate` methods with the same signatures as
the generic interface, which is what you normally call. Interfaces marked `[Validate]` receive
only the generic implementation.

## ValidationResult

```csharp
public sealed partial class ValidationResult : IEnumerable<ValidationError>
```

| Member                                                                                                 | Description                                                                 |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `bool IsValid`                                                                                         | `true` when no errors have been added                                       |
| `IReadOnlyList<ValidationError> Errors`                                                                | The failures collected so far                                               |
| `void Add(ValidationError validationError)`                                                            | Adds a pre-built error unconditionally                                      |
| `void Add(string propertyName, string messageTemplate, Dictionary<string, object?>? arguments = null)` | Adds an error unconditionally, substituting message tokens from `arguments` |
| `void Add(Expression<Func<bool>> expression, string? overrideMessage = null)`                          | Evaluates a `ValidateProperty` call and adds an error if it returns `false` |
| `void AddRange(IEnumerable<ValidationError> errors)`                                                   | Adds several errors unconditionally                                         |
| `bool VisitType(Type type)`                                                                            | Generated-code only — records that a type has been validated in this result |

The class implements `IEnumerable<ValidationError>` and has `Add` methods, so collection
initializer syntax works: `new ValidationResult { { "Prop", "message" } }`.

`Add(Expression<Func<bool>>)` requires an expression of the exact form
`() => SomeValidatorAttribute.ValidateProperty(target.Property, …)`, where the method is
`public static bool` on a `ValidatorAttribute` subclass. Anything else throws
`NotSupportedException`. See
[Additional validations](/docs/Immediate.Validations/additional-validations).

<Callout type="note">

`VisitType` is marked `[EditorBrowsable(Never)]` and exists so that generated code can avoid
running the same type's validators twice within one result. It returns `false` if the type has
already been visited.

</Callout>

## ValidationError

```csharp
public sealed record ValidationError
{
	public required string PropertyName { get; init; }
	public required string ErrorMessage { get; init; }
}
```

`PropertyName` is a property **path**, not a display name — see
[property path rules](/docs/Immediate.Validations/nested-and-collection-validation#property-path-rules).
Being a record, errors compare structurally, which makes them convenient to assert on in tests.

## ValidationException

```csharp
public sealed class ValidationException : Exception
```

| Member                                                                | Description                                               |
| --------------------------------------------------------------------- | --------------------------------------------------------- |
| `string Title`                                                        | The base message; `"Validation failed"` unless overridden |
| `IReadOnlyList<ValidationError> Errors`                               | The failures                                              |
| `static void ThrowIfInvalid<T>(T obj)`                                | Validates and throws; `T : IValidationTarget<T>`          |
| `static void ThrowIfInvalid<T>(T obj, string message)`                | As above, with a custom title                             |
| `static void ThrowIfInvalid<T>(T obj, Func<T, string> messageFunc)`   | As above, with a title computed from the instance         |
| `static void ThrowIfInvalid(ValidationResult errors)`                 | Throws if the result has errors                           |
| `static void ThrowIfInvalid(ValidationResult errors, string message)` | As above, with a custom title                             |

There are no public constructors — instances are only created by `ThrowIfInvalid`. `Message` is
built from the title plus one ` -- PropertyName: ErrorMessage` line per failure.

## ValidationBehavior

```csharp
public sealed class ValidationBehavior<TRequest, TResponse>
	: Behavior<TRequest, TResponse>
	where TRequest : IValidationTarget<TRequest>
```

An Immediate.Handlers behavior that calls `ValidationException.ThrowIfInvalid(request)` before
invoking the rest of the pipeline. Register it assembly-wide with
`[assembly: Behaviors(typeof(ValidationBehavior<,>))]`; the constraint means it is applied only to
handlers whose request type is a validation target. See
[Integrating with Immediate.Handlers](/docs/Immediate.Validations/immediate-handlers-integration).

## ValidationConfiguration

```csharp
public static class ValidationConfiguration
{
	public static IStringLocalizer Localizer { get; set; }
}
```

The message catalogue used by every built-in validator's `DefaultMessage`. Defaults to a built-in
localizer with English and French messages. Assign during startup to override; see
[Localization](/docs/Immediate.Validations/localization).

## ValidatorAttribute

```csharp
[AttributeUsage(AttributeTargets.Property)]
public abstract class ValidatorAttribute : Attribute
{
	public string? Message { get; init; }
}
```

The base class for every validator. `Message` overrides the validator's `DefaultMessage` for the
property it is applied to, and is the one member excluded from the analyzer's
parameter-matching rules. Deriving from this type opts you into the contract described in
[Building custom validators](/docs/Immediate.Validations/custom-validators).

## TargetTypeAttribute

```csharp
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class TargetTypeAttribute : Attribute;
```

Applied to an `object`, `string`, `object[]` or `string[]` parameter or property of a validator to
indicate that the value supplied must match the type of the validated property. It also enables
`nameof(...)` resolution for constructor parameters.
