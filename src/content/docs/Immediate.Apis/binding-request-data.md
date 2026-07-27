---
title: Binding request data
description: How the generator infers the binding attribute for your request type, and how to override it.
order: 3
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Your handler takes a single request object, but minimal APIs need to know _where_ that object comes
from: the body, the query string, the route, or a mixture. Immediate.Apis works this out at compile
time and stamps a single binding attribute onto the generated delegate parameter:

```csharp
async (
	[Microsoft.AspNetCore.Mvc.FromBodyAttribute] MyFeature.Command parameters,
	[Microsoft.AspNetCore.Mvc.FromServices] MyFeature.Handler handler,
	CancellationToken token
) => { /* ... */ }
```

## The inference order

The generator applies the first rule that matches, in this order:

1. **An explicit binding attribute on the request parameter of `Handle`/`HandleAsync` wins.**
   Recognised attributes are `[AsParameters]`, `[FromBody]`, `[FromForm]`, `[FromHeader]`,
   `[FromQuery]` and `[FromRoute]`. Whichever you write is copied verbatim.
2. **Otherwise, if any property of the request type is an `IFormFile`, the request binds as
   `[FromForm]`.** This makes file uploads work without any annotation.
3. **Otherwise, if any property of the request type carries a `[FromBody]`, `[FromForm]`,
   `[FromHeader]`, `[FromQuery]` or `[FromRoute]` attribute, the request binds as
   `[AsParameters]`.** This is the composite case, and it is _inferred_ — you do not have to write
   `[AsParameters]` yourself.
4. **Otherwise the verb decides.** `[MapPost]`, `[MapPut]` and `[MapPatch]` bind `[FromBody]`;
   `[MapGet]`, `[MapDelete]` and `[MapMethod]` bind `[AsParameters]`.

<Callout type="tip" title="[AsParameters] is inferred, not required">

Earlier versions of this documentation described step 3 as something you add by hand. It is not:
putting a `[FromRoute]` (or any other `[FromXxx]`) on a request property is enough for the generator
to switch the whole request to `[AsParameters]`. Writing `[AsParameters]` on the parameter as well is
redundant but harmless — it simply short-circuits at step 1 to the same result.

</Callout>

<Callout type="warning" title="PATCH binds the body too">

`PATCH` is in the body-binding set alongside `POST` and `PUT`. The package readme and older versions
of this page listed only `POST` and `PUT`.

</Callout>

<Callout type="warning" title="[MapMethod] is not verb-aware">

Step 4 keys off the _attribute_, not the verb string. `[MapMethod("POST", "/users")]` falls into the
`[AsParameters]` branch, because the generator only special-cases `[MapPost]`, `[MapPut]` and
`[MapPatch]`. If you need body binding from `[MapMethod]`, write `[FromBody]` on the request
parameter explicitly.

</Callout>

Two more details worth knowing about steps 2 and 3:

- Only **properties** are examined — fields and constructor parameters that are not also properties
  are not considered. Positional records are fine, since their parameters become properties.
- Only properties **declared on the request type itself** are examined; properties inherited from a
  base type do not trigger the inference.

## A worked example: a PUT with route and body

A `PUT` that takes its identifier from the route and the rest of the payload from the body is the
canonical composite case. Annotate the properties, and the request binds itself:

```csharp title="UpdateTodo.cs" {13,16}
[Handler]
[MapPut("/api/todos/{id:int}")]
public static partial class UpdateTodo
{
	public sealed record Body
	{
		public required string Title { get; init; }
		public required bool Completed { get; init; }
	}

	public sealed record Command
	{
		[FromRoute]
		public required int Id { get; init; }

		[FromBody]
		public required Body Body { get; init; }
	}

	private static async ValueTask<Results<NoContent, NotFound>> HandleAsync(
		Command command,
		TodoDbContext dbContext,
		CancellationToken token
	)
	{
		// ...
	}
}
```

Because `Command` has properties carrying `[FromRoute]` and `[FromBody]`, rule 3 fires and the
generated delegate receives `[AsParameters] UpdateTodo.Command`. ASP.NET Core then binds `Id` from
the route value `id` and `Body` from the request body. Without the property attributes, rule 4 would
have applied and the whole `Command` — including `Id` — would have been read from the body.

## Overriding the inference

Write the attribute you want on the request parameter itself, and every other rule is skipped:

```csharp title="SearchUsers.cs" {8}
[Handler]
[MapPost("/users/search")]
public static partial class SearchUsers
{
	public sealed record Query;

	private static ValueTask<IReadOnlyList<User>> HandleAsync(
		[AsParameters] Query query,
		UsersService usersService,
		CancellationToken token
	)
	{
		return usersService.SearchAsync(query, token);
	}
}
```

This is the escape hatch for a `POST` whose parameters live in the query string, a `GET` whose
request should come from a header, and so on.

## File uploads

Any `IFormFile` property flips the whole request to `[FromForm]`, whatever the verb:

```csharp title="UploadAvatar.cs" {7}
[Handler]
[MapPost("/users/avatar")]
public static partial class UploadAvatar
{
	public sealed record Command
	{
		public required IFormFile File { get; init; }
	}

	private static ValueTask<string> HandleAsync(
		Command command,
		AvatarService avatarService,
		CancellationToken token
	)
	{
		return avatarService.StoreAsync(command.File, token);
	}
}
```

Note the ordering: the `IFormFile` check (rule 2) runs _before_ the `[FromXxx]`-property check
(rule 3), so a request type that has both an `IFormFile` property and, say, a `[FromRoute]` property
binds as `[FromForm]`, not `[AsParameters]`. If you need the composite behavior, write
`[AsParameters]` on the parameter explicitly.

## Checking what was inferred

The generated file records the decision in an XML doc comment on the partial class, so you never have
to guess:

```csharp
/// <remarks><see cref="global::Todos.UpdateTodo.Command" /> registered using
/// <c>[<see cref="global::Microsoft.AspNetCore.Http.AsParametersAttribute" />]</c></remarks>
partial class UpdateTodo
```

See [How it works](/docs/Immediate.Apis/how-it-works) for how to get at the generated files.
