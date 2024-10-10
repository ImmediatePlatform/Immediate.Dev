---
title: Handling failures
---

# {$frontmatter.title}

The result of a validation behavior running is that when a parameter fails one or more validations, a `ValidationException` is thrown, which can be handled via `ProblemDetails` or any other infrastructure mechanism.

For example, using ASP.NET Core `ProblemDetails`:

```cs |copy|title=Program.cs {1}
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
