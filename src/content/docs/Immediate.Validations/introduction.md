---
title: Introduction
description: Compile-time generated validation for your requests, with no reflection and no runtime rule registration.
order: 1
---

<script lang="ts">
	import { Callout, CardGrid, LinkCard, PackageBadges } from '$lib/components/docs';
</script>

<PackageBadges name="Immediate.Validations" />

Immediate.Validations generates validation code at compile time. You annotate a type with `[Validate]`, declare that it implements `IValidationTarget<T>`, and decorate its properties with validator attributes; the source generator emits a `Validate` method that runs those checks in order and returns a `ValidationResult`. There is no rule registry, no expression trees at runtime, no reflection over your types, and nothing to register in the container. Mistakes — a missing attribute, a validator applied to a type it cannot handle, a behavior pipeline that forgot validation — are reported as compiler diagnostics rather than as surprises in production.

## Installation

```bash
dotnet add package Immediate.Validations
```

<Callout type="note" title="Prerequisites">

Immediate.Validations depends on **Immediate.Handlers**, which comes in transitively — you do
not need to install it separately. Supported target frameworks are `net8.0` through `net10.0`.
The `ValidationBehavior<,>` integration additionally requires an Immediate.Handlers pipeline;
see [Integrating with Immediate.Handlers](/docs/Immediate.Validations/immediate-handlers-integration).

</Callout>

## A minimal example

```csharp title="GetUserQuery.cs"
using Immediate.Validations.Shared;

[Validate]
public sealed partial record Query : IValidationTarget<Query>
{
	[GreaterThan(0)]
	public required int Id { get; init; }

	[NotEmpty]
	public required string Name { get; init; }
}
```

```csharp
var result = Query.Validate(new Query { Id = 0, Name = "" });

// result.IsValid == false
// result.Errors[0] => { PropertyName = "Id",   ErrorMessage = "'Id' must be greater than '0'." }
// result.Errors[1] => { PropertyName = "Name", ErrorMessage = "'Name' must not be empty." }
```

The type must be `partial` — the generator writes the other half.

## What it replaces

If you are coming from FluentValidation, the mental shift is that rules live on the type as
attributes rather than in a separate `AbstractValidator<T>` class, and they are resolved by the
compiler rather than by assembly scanning. Anything attributes cannot express goes in an
[`AdditionalValidations` method](/docs/Immediate.Validations/additional-validations) on the type
itself, which gives you the same imperative freedom without a second class.

If you are coming from `System.ComponentModel.DataAnnotations`, the surface will look familiar,
but validation is executed by generated code instead of `Validator.TryValidateObject`'s
reflection walk, nested objects and collections are recursed into automatically, and the whole
thing is trimming- and AOT-friendly.

## Where to go next

<CardGrid cols={2}>
	<LinkCard
		title="Creating validators"
		description="[Validate], IValidationTarget, and the automatic checks you get for free."
		href="/docs/Immediate.Validations/creating-validators"
	/>
	<LinkCard
		title="Built-in validators"
		description="All 15 validator attributes, with signatures and default messages."
		href="/docs/Immediate.Validations/built-in-validators"
	/>
	<LinkCard
		title="Nested and collection validation"
		description="How child objects and collections are walked, and how error paths are named."
		href="/docs/Immediate.Validations/nested-and-collection-validation"
	/>
	<LinkCard
		title="Building custom validators"
		description="The analyzer-enforced contract for your own validator attributes."
		href="/docs/Immediate.Validations/custom-validators"
	/>
	<LinkCard
		title="Integrating with Immediate.Handlers"
		description="Register ValidationBehavior so every request is validated automatically."
		href="/docs/Immediate.Validations/immediate-handlers-integration"
	/>
	<LinkCard
		title="Diagnostics"
		description="Every IV diagnostic, its severity, and how to fix it."
		href="/docs/Immediate.Validations/diagnostics"
	/>
</CardGrid>
