---
title: Validating instances
description: Call Validate directly, inspect the result, or throw with ThrowIfInvalid.
order: 8
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

You do not need Immediate.Handlers to use Immediate.Validations. Every `[Validate]` type gets a
public static `Validate` method you can call from anywhere.

```csharp
public void Method(Query query)
{
	var result = Query.Validate(query);

	if (!result.IsValid)
	{
		foreach (var error in result.Errors)
			Console.WriteLine($"{error.PropertyName}: {error.ErrorMessage}");
	}
}
```

`ValidationResult` exposes `IsValid`, an `IReadOnlyList<ValidationError>` of `Errors`, and
implements `IEnumerable<ValidationError>` — so you can `foreach` it or LINQ over it directly.

## Validating through an interface

The generated type also implements the non-generic `IValidationTarget`, whose `Validate()` is an
explicit implementation. Use it when you have an instance but not its concrete type:

```csharp
public void Method(IValidationTarget target)
{
	var result = target.Validate();
}
```

Both `Validate` shapes have an overload taking an existing `ValidationResult`, which accumulates
into it and returns it — useful when validating several objects into one result:

```csharp
var errors = new ValidationResult();

_ = Query.Validate(query, errors);
_ = Command.Validate(command, errors);

if (!errors.IsValid) { /* … */ }
```

<Callout type="warning">

If the target is a `null` reference, `Validate` returns a **new** `ValidationResult` containing
a single `.self` error, discarding any result you passed in. Check the return value rather than
the variable you passed.

</Callout>

## Throwing on failure

`ValidationException.ThrowIfInvalid` throws a `ValidationException` when validation fails and
does nothing when it passes. There are five overloads.

```csharp
// validate and throw, default title "Validation failed"
ValidationException.ThrowIfInvalid(query);

// validate and throw with a custom title
ValidationException.ThrowIfInvalid(query, "Query is invalid");

// validate and throw with a title computed from the instance
ValidationException.ThrowIfInvalid(query, static q => $"Query {q.Id} is invalid");

// throw from a result you already have
var result = Query.Validate(query);
ValidationException.ThrowIfInvalid(result);

// …with a custom title
ValidationException.ThrowIfInvalid(result, "Query is invalid");
```

The three instance overloads are constrained to `IValidationTarget<T>`, so they only compile for
a type that declares the interface. The two `ValidationResult` overloads work with any result,
including one you assembled by hand.

`ValidationException` carries the failures on `Errors` and the title on `Title`. Its `Message` is
the title followed by one line per failure:

```text
Query is invalid:
 -- Id: 'Id' must be greater than '0'.
 -- Name: 'Name' must not be empty.
```

<Callout type="note">

The message-function overload throws `ArgumentNullException` if the function is `null`, and the
function is only invoked when validation has already failed — so it is safe to make it
expensive.

</Callout>

## In a handler pipeline

Doing this by hand in every handler is exactly what `ValidationBehavior<,>` removes. See
[Integrating with Immediate.Handlers](/docs/Immediate.Validations/immediate-handlers-integration).
