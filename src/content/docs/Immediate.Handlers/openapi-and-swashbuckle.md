---
title: OpenAPI and Swashbuckle
description: Fix the duplicate schemaId error Swashbuckle throws when handlers nest their Query, Command and Response types.
order: 8
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Nesting the request and response types inside the handler class keeps a slice self-contained, and it is
the convention throughout these docs. It does have one collision with Swashbuckle, which you will hit
the first time you expose two handlers over HTTP.

## The error

Swashbuckle derives each schema's `schemaId` from the type's short name. With nested request types,
several handlers all contribute a type called `Command`, and Swashbuckle refuses:

```text
Swashbuckle.AspNetCore.SwaggerGen.SwaggerGeneratorException: Failed to generate schema for type - MyApp.Api.DeleteUser+Command. See inner exception
System.InvalidOperationException: Can't use schemaId "$Command" for type "$MyApp.Api.DeleteUser+Command". The same schemaId is already used for type "$MyApp.Api.CreateUserCommand+Command"
```

The `+` in `MyApp.Api.DeleteUser+Command` is the CLR's separator for a nested type. Two different
handlers each declaring a nested `Command` produce two types whose short names are identical.

## The fix

Tell Swashbuckle to build schema ids from the full name, replacing the nesting separator with a dot so
the resulting ids remain valid:

```csharp title="Program.cs"
builder.Services.AddSwaggerGen(options =>
{
	options.CustomSchemaIds(x =>
		x.FullName?.Replace("+", ".", StringComparison.Ordinal) ?? x.Name);
});
```

`DeleteUser+Command` then becomes `MyApp.Api.DeleteUser.Command`, which is unique.

<Callout type="tip">

Full names make for long, namespace-heavy schema ids in the generated document. If you would
rather flatten the nested portion, an alternative is to append the nested type name to the
declaring type's full name:

```csharp
options.CustomSchemaIds(x =>
	x.DeclaringType?.FullName is { } declaringName
		? $"{declaringName.Replace("+", ".", StringComparison.Ordinal)}{x.Name}"
		: x.Name);
```

which yields `MyApp.Api.DeleteUserCommand` and `MyApp.Api.CreateUserCommand`. Pick whichever
reads better in your client generator; retaining the namespace ensures that declaring types with
the same name do not collide.

</Callout>

## Microsoft.AspNetCore.OpenApi

`CustomSchemaIds` is Swashbuckle's API and has no effect on the built-in OpenAPI document generator in
.NET 9 and later. If you hit a duplicate reference id there, the equivalent lever is
`OpenApiOptions.CreateSchemaReferenceId`, configured through `AddOpenApi`.

## Avoiding it entirely

The collision is caused by nesting, not by Immediate.Handlers. Declaring the request and response as
top-level types with distinct names sidesteps it:

```csharp title="DeleteUser.cs"
public sealed record DeleteUserCommand(int Id);

[Handler]
public static partial class DeleteUser
{
	private static ValueTask HandleAsync(DeleteUserCommand command, CancellationToken token) =>
		// ..
}
```

Nothing in the generator requires nested types — see [Creating
handlers](/docs/Immediate.Handlers/creating-handlers). It is a trade of
locality against schema ergonomics; most projects keep the nesting and set `CustomSchemaIds` once.

For exposing handlers as endpoints in the first place, see
[Immediate.Apis](/docs/Immediate.Apis/creating-endpoints).
