---
title: OpenAPI and Swagger
description: Fix duplicate schema IDs caused by nested request types, in both Swashbuckle and Microsoft.AspNetCore.OpenApi.
order: 8
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Apis endpoints are ordinary minimal API endpoints, so every OpenAPI tool works with them
unchanged. There is one wrinkle: the convention of nesting `Query`, `Command` and `Response` types
inside the handler class means several different types share a simple name, and OpenAPI schema
identifiers are derived from simple names by default.

## The duplicate schema ID error

With Swashbuckle you will see something like this at startup:

```text
Swashbuckle.AspNetCore.SwaggerGen.SwaggerGeneratorException: Failed to generate schema for type - MyApp.Api.DeleteUser+Command. See inner exception
System.InvalidOperationException: Can't use schemaId "$Command" for type "$MyApp.Api.DeleteUser+Command". The same schemaId is already used for type "$MyApp.Api.CreateUser+Command"
```

Two handlers in different namespaces each declare a nested type called `Command`, and the default
schema-ID selector cannot tell them apart. The fix is to include the declaring type in the
identifier.

## Swashbuckle

Configure `CustomSchemaIds` to use the full name, replacing the CLR nested-type separator `+` with a
`.`:

```csharp title="Program.cs" {3}
builder.Services.AddSwaggerGen(options =>
{
	options.CustomSchemaIds(t => t.FullName?.Replace('+', '.'));
});
```

`DeleteUser+Command` then becomes `MyApp.Api.DeleteUser.Command`, which is unique.

## Microsoft.AspNetCore.OpenApi and Scalar

The built-in OpenAPI document generator has the same problem and a different knob:
`OpenApiOptions.CreateSchemaReferenceId`. Return your own identifier for nested types and fall back
to the default for everything else:

```csharp title="Program.cs" {2-5}
builder.Services
	.AddOpenApi(o => o.CreateSchemaReferenceId = t =>
		t.Type.IsNested
			? $"{t.Type.DeclaringType!.Name}+{t.Type.Name}"
			: OpenApiOptions.CreateDefaultSchemaReferenceId(t));

var app = builder.Build();

app.MapOpenApi().CacheOutput();
app.MapScalarApiReference();

app.MapUsersApiEndpoints();
```

`CreateSchemaReferenceId` receives a `JsonTypeInfo`, so the CLR type is on `t.Type`. This produces
`DeleteUser+Command` and `CreateUser+Command` — distinct, and readable in the Scalar or Swagger UI
sidebar. It needs `Microsoft.AspNetCore.OpenApi`; the `MapScalarApiReference()` call comes from
`Scalar.AspNetCore` and is optional.

<Callout type="note">

This is exactly what the package's own `Immediate.Apis.FunctionalTests.Scalar` sample does, and it is
the setup to copy for a project that has moved off Swashbuckle.

</Callout>

## Describing endpoints

Once schema IDs are unique, the rest is standard minimal API metadata. There are two places to put
it:

- **Attributes on `Handle`/`HandleAsync`** are copied onto the generated delegate —
  `[ProducesResponseType<T>]`, `[Produces]`, `[Tags]`, and so on.
- **`CustomizeEndpoint`** gives you the builder, for `WithSummary`, `WithDescription`,
  `ProducesValidationProblem`, `WithOpenApi` and the rest.

```csharp title="GetForecast.cs" {5-6,13-14}
[Handler]
[MapGet("/forecast/{id:int}")]
public static partial class GetForecast
{
	internal static void CustomizeEndpoint(IEndpointConventionBuilder endpoint)
		=> endpoint.WithDescription("Gets the current weather forecast");

	public sealed record Query
	{
		public required int Id { get; init; }
	}

	[ProducesResponseType<IReadOnlyList<Result>>(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	private static async ValueTask<IReadOnlyList<Result>> HandleAsync(
		Query _,
		CancellationToken token
	)
	{
		// ...
	}
}
```

XML doc comments on the request type's properties and on the `Handle` method flow through to the
OpenAPI document when the project has `GenerateDocumentationFile` enabled, exactly as they would for
a hand-written endpoint.

See [Customizing endpoints](/docs/Immediate.Apis/customizing-endpoints) for the full rules on both
mechanisms.
