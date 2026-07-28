---
title: Diagnostics
description: Every IV diagnostic with its severity and trigger, plus the code fixes, refactoring and suppressors.
order: 14
group: Diagnostics
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Validations ships seventeen diagnostics, all in the `ImmediateValidations` category and
all enabled by default. IV0001–IV0010 police the
[custom validator contract](/docs/Immediate.Validations/custom-validators); IV0011 checks the
handler pipeline; IV0012–IV0018 check how validators are applied to your types.

| ID                | Severity | Title                                                                   | Code fix |
| ----------------- | -------- | ----------------------------------------------------------------------- | -------- |
| [IV0001](#iv0001) | Error    | Validators must have a valid `ValidateProperty` method                  | Yes      |
| [IV0002](#iv0002) | Error    | `ValidateProperty` method must be static                                | Yes      |
| [IV0003](#iv0003) | Error    | `ValidateProperty` method must be unique                                | —        |
| [IV0004](#iv0004) | Error    | `ValidateProperty` method must have a valid return                      | Yes      |
| [IV0005](#iv0005) | Error    | `ValidateProperty` method is missing parameters                         | —        |
| [IV0006](#iv0006) | Error    | `ValidateProperty` method has extra parameters                          | —        |
| [IV0007](#iv0007) | Error    | `ValidateProperty` parameters and Validator properties must match       | —        |
| [IV0008](#iv0008) | Error    | Validator property must be `required`                                   | —        |
| [IV0009](#iv0009) | Error    | Validator has too many constructors                                     | —        |
| [IV0010](#iv0010) | Error    | Validator is missing `DefaultMessage`                                   | —        |
| [IV0011](#iv0011) | Warning  | Assembly-wide `Behaviors` attribute should use `ValidationBehavior<,>`  | —        |
| [IV0012](#iv0012) | Error    | Validation targets must be marked `[Validate]`                          | Yes      |
| [IV0013](#iv0013) | Warning  | Validation targets should implement the interface `IValidationTarget<>` | Yes      |
| [IV0014](#iv0014) | Warning  | Validator will not be used                                              | —        |
| [IV0015](#iv0015) | Warning  | Parameter is incompatible type                                          | —        |
| [IV0016](#iv0016) | —        | _Removed in release 2.3_                                                | —        |
| [IV0017](#iv0017) | Error    | `nameof()` target is invalid                                            | —        |
| [IV0018](#iv0018) | Warning  | `[NotNull]` applied to not-null property                                | —        |

Severity can be adjusted per project in `.editorconfig`:

```text title=".editorconfig"
[*.cs]
dotnet_diagnostic.IV0011.severity = none
```

## Diagnostic reference

### IV0001

A type deriving from `ValidatorAttribute` has no method named `ValidateProperty`. The generated
code has nothing to call.

**Fix:** add `public static bool ValidateProperty(…)`. The code fix **Add 'ValidateProperty'
method** scaffolds one; it is offered on class declarations.

### IV0002

`ValidateProperty` exists but is not `static`. Generated code calls it without an instance.

**Fix:** add the `static` modifier, or use the **Make 'ValidateProperty' method static** code fix.

### IV0003

More than one `static` `ValidateProperty` overload was found on the validator. Overloads are not
supported — the generator would not know which to bind.

**Fix:** collapse them into one method, using a generic parameter or optional parameters if you
need flexibility.

### IV0004

`ValidateProperty` does not return `bool`. `true` must mean the value is valid.

**Fix:** change the return type, or use the **Correct 'ValidateProperty' return type** code fix.

### IV0005

The validator declares a constructor parameter or settable property with no matching
`ValidateProperty` parameter. Matching is by name, case-insensitively. Reported on the offending
property or parameter.

**Fix:** add the parameter to `ValidateProperty`, or remove the attribute member.

### IV0006

The mirror image: `ValidateProperty` declares a parameter (other than the first) that has no
matching constructor parameter or property on the validator, so nothing can ever supply a value
for it.

**Fix:** add a constructor parameter or `required` property with that name, or remove the
parameter.

### IV0007

A matching pair exists, but the attribute member's type is not assignable to the
`ValidateProperty` parameter's type. Reported twice — once on the parameter, once on the member.

**Fix:** align the types, or mark the attribute member `[TargetType]` if it is deliberately typed
as `object` or `string` to accept the validated property's type.

### IV0008

A `ValidateProperty` parameter has no default value, but the attribute member that feeds it is
optional — a property that is not `required`, or a constructor parameter with a default. The
generated call would have no value to pass.

**Fix:** mark the property `required` and remove the constructor parameter's default, or give the
`ValidateProperty` parameter a default value.

### IV0009

The validator declares two or more non-static constructors. Only one is supported. Reported once
per constructor.

**Fix:** reduce to a single constructor, moving optional configuration to init-only properties.

### IV0010

The validator has no `public static string DefaultMessage` property and no
`public const string DefaultMessage` field. Without one there is no message to record on failure,
and `ValidationResult.Add(() => …)` would throw at runtime.

**Fix:** add one. Read it from `ValidationConfiguration.Localizer` if you want it localizable.

### IV0011

The assembly declares `[assembly: Behaviors(...)]` without `ValidationBehavior<,>` in the list, so
validation targets in this assembly are generated but never executed by the handler pipeline.

**Fix:** add `typeof(ValidationBehavior<,>)` to the list — see
[Integrating with Immediate.Handlers](/docs/Immediate.Validations/immediate-handlers-integration).

<Callout type="note">

The check only inspects the assembly-level attribute. A `[Behaviors]` attribute on an individual
handler _replaces_ the assembly list for that handler and is not analysed, so a handler-level
override can drop validation silently.

</Callout>

### IV0012

A type applies validator attributes to its properties, or declares `IValidationTarget<T>`, but is
not marked `[Validate]`. Without the attribute the generator never sees it and no validation code
is produced.

**Fix:** add `[Validate]`, or use the **Add `[Validate]`** code fix.

### IV0013

A validation target does not declare `IValidationTarget<TSelf>`. Validation code is still
generated, but `ValidationBehavior<,>` and the generic `ThrowIfInvalid` overloads will not accept
the type, because both are constrained on the interface.

**Fix:** add the interface, or use the **Add `IValidationTarget<T>`** code fix. Both support
fix-all.

### IV0014

A validator attribute was applied to a property whose type it cannot handle — `[Length]` on an
`int`, for instance, or a custom validator whose generic constraints the property type does not
satisfy. The attribute is **silently dropped** from the generated code, so this warning is the
only signal that the rule is not running.

The diagnostic is tagged _unnecessary_, so IDEs fade the attribute out.

**Fix:** remove the attribute or change the property type.

### IV0015

A value passed to a `[TargetType]` parameter or property does not have the required type — a
`string` literal where the validated property is an `int`, or a `nameof()` reference to a member
of the wrong type.

**Fix:** pass a value of the validated property's type, or of the type the validator's
`ValidateProperty` parameter declares (`int` for the length validators, `Regex` for
`Match`'s `regex`).

### IV0016

**Removed in release 2.3.** It reported an invalid-type `nameof()` reference passed to a
validator; that case is now covered by [IV0015](#iv0015). No analyzer reports IV0016 any more, so
suppressions for it can be deleted.

<Callout type="note">

The analyzer package's bundled `Immediate.Validations.Analyzers.md` still documents IV0016, and
`DiagnosticIds.cs` still defines an unused `IV0019` constant. Neither is reported by any
analyzer.

</Callout>

### IV0017

A `nameof()` argument does not resolve to something usable: it names something that is not a
property, field or method; it names an instance member of another type; or it names a member that
does not exist on the validated type. The message states what the reference must refer to.

**Fix:** point the reference at a property, field or parameterless method on the validated type,
or at a static member of another type.

### IV0018

`[NotNull]` was applied to a property whose type is a non-nullable value type, where the check can
never fail.

**Fix:** remove the attribute, or change the property type to `Nullable<T>` if the value really is
optional.

## Code fixes and refactorings

| Provider                                           | Applies to      | Title                                  |
| -------------------------------------------------- | --------------- | -------------------------------------- |
| `AddValidateMethodCodefixProvider`                 | IV0001          | Add 'ValidateProperty' method          |
| `MakeValidatePropertyMethodStaticCodefixProvider`  | IV0002          | Make 'ValidateProperty' method static  |
| `CorrectValidatePropertyReturnTypeCodefixProvider` | IV0004          | Correct 'ValidateProperty' return type |
| `AddValidateAttributeCodefixProvider`              | IV0012          | Add `[Validate]`                       |
| `AddIValidationTargetCodefixProvider`              | IV0013          | Add `IValidationTarget<T>`             |
| `AddAdditionalValidationsCodeRefactoringProvider`  | _(refactoring)_ | Add AdditionalValidations Method       |

All five code fixes support batch fix-all. The refactoring is offered from the lightbulb menu on
any `[Validate]` type that does not already declare an
[`AdditionalValidations`](/docs/Immediate.Validations/additional-validations) method.

## Suppressors

Two `DiagnosticSuppressor`s ship with the package to silence compiler and analyzer warnings that
are false positives in this programming model.

| Suppressor                             | Suppresses         | When                                                                                                         |
| -------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `InvalidAttributeTargetSuppressor`     | `CS0658`           | An `element:` attribute target on a collection-typed property or record parameter inside a `[Validate]` type |
| `UnusedConstructorParameterSuppressor` | `CS9113`, `CA1019` | Constructor parameters on any type deriving from `ValidatorAttribute`                                        |

`CS0658` is "not a recognized attribute location"; suppressing it is what makes the
[`element:` syntax](/docs/Immediate.Validations/nested-and-collection-validation#validating-elements-instead-of-the-collection)
usable. `CS9113` is "parameter is unread" and `CA1019` is "define accessors for attribute
arguments" — both are expected on validators, whose constructor parameters are consumed by
generated code rather than by the attribute itself.
