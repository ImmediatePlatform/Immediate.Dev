---
title: Handling validation failures
description: Turn a ValidationException into a 400 response with ProblemDetails.
order: 10
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

A failed validation surfaces as a `ValidationException` thrown out of the handler. It carries
`Title` (the base message) and `Errors`, a list of `ValidationError` records with `PropertyName`
and `ErrorMessage`. In an ASP.NET Core application, the natural place to translate it is
`ProblemDetails`.

```csharp title="Program.cs" {1}
builder.Services.AddProblemDetails(ConfigureProblemDetails);

public static void ConfigureProblemDetails(ProblemDetailsOptions options) =>
	options.CustomizeProblemDetails = c =>
	{
		if (c.Exception is null)
			return;

		c.ProblemDetails = c.Exception switch
		{
			ValidationException ex => new ValidationProblemDetails(
				ex
					.Errors
					.GroupBy(x => x.PropertyName, StringComparer.OrdinalIgnoreCase)
					.ToDictionary(
						x => x.Key,
						x => x.Select(x => x.ErrorMessage).ToArray(),
						StringComparer.OrdinalIgnoreCase
					)
			)
			{
				Title = ex.Title,
				Status = StatusCodes.Status400BadRequest,
			},

			// other exception handling as desired

			var ex => new ProblemDetails
			{
				Detail = "An error has occurred.",
				Status = StatusCodes.Status500InternalServerError,
			},
		};

		c.HttpContext.Response.StatusCode =
			c.ProblemDetails.Status
			?? StatusCodes.Status500InternalServerError;
	};
```

`CustomizeProblemDetails` only sees `c.Exception` when the exception handler middleware is in the
pipeline, so make sure `app.UseExceptionHandler()` (or the developer exception page in
development) is registered.

## About those dictionary keys

The grouping key is `ValidationError.PropertyName`, which is a **path**, not a flat name.
Nested objects produce `Address.Street`, collection elements produce `Addresses[2].Street`, and a
`null` root target produces the sentinel `.self`. Client code that maps these back onto form
fields needs to expect that shape — the full rules are in
[property path rules](/docs/Immediate.Validations/nested-and-collection-validation#property-path-rules).

<Callout type="note">

The message text is the human-readable half: `{PropertyName}` inside a message renders a
humanized display name (`'Street'`), not the path. If your client renders `ErrorMessage`
verbatim next to a field, that is usually what you want; if it does its own lookup, use the
dictionary key.

</Callout>

## Camel-casing the keys for a JavaScript client

`ValidationProblemDetails` serializes the dictionary keys as-is. If your front end expects
camelCase, transform them when you build the dictionary — a naive `JsonNamingPolicy.CamelCase`
over the whole path will not do the right thing with indexes, so split on `.` first:

```csharp title="Program.cs"
static string ToCamelCasePath(string path) =>
	string.Join(
		'.',
		path
			.Split('.')
			.Select(segment => JsonNamingPolicy.CamelCase.ConvertName(segment))
	);
```

## Not using ASP.NET Core

`ValidationException` is an ordinary exception, so anything that catches it works. If you would
rather not use exceptions for control flow, skip `ValidationBehavior<,>` and call
[`Validate` directly](/docs/Immediate.Validations/validating-instances), inspecting `IsValid`.
