---
title: Introduction
description: Immediate.Apis turns Immediate.Handlers handlers into ASP.NET Core minimal API endpoints at compile time.
order: 1
---

<script lang="ts">
	import { Callout, CardGrid, LinkCard, PackageBadges } from '$lib/components/docs';
</script>

<PackageBadges name="Immediate.Apis" />

Immediate.Apis is a source generator that bridges [Immediate.Handlers](/docs/Immediate.Handlers/introduction)
to ASP.NET Core minimal APIs. Add a `[MapGet]` (or `[MapPost]`, `[MapPut]`, …) attribute alongside
`[Handler]`, and the generator emits the `app.MapGet(...)` call, the request-binding attribute, the
authorization conventions and an assembly-wide registration method — all at compile time, with no
reflection and no runtime endpoint scanning.

## Installation

```bash
dotnet add package Immediate.Apis
```

<Callout type="note" title="Prerequisites">

- **Immediate.Handlers** is required and is pulled in as a package dependency. Every endpoint is a
  handler first: the class must carry `[Handler]`, or the generator emits nothing and
  [IAPI0001](/docs/Immediate.Apis/diagnostics#iapi0001) is reported as an error.
- **An ASP.NET Core project.** The generated code calls into `Microsoft.AspNetCore.Builder` and
  `Microsoft.AspNetCore.Routing`, which come from the ASP.NET Core shared framework.
- The package targets `net8.0`, `net9.0` and `net10.0`.

</Callout>

## A minimal example

```csharp title="GetUsers.cs" {2}
[Handler]
[MapGet("/users")]
public static partial class GetUsers
{
	public sealed record Query;

	private static ValueTask<IEnumerable<User>> HandleAsync(
		Query _,
		UsersService usersService,
		CancellationToken token
	)
	{
		return usersService.GetUsersAsync(token);
	}
}
```

Then register everything once in `Program.cs`:

```csharp title="Program.cs" {3,7}
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddUsersApiHandlers();

var app = builder.Build();

app.MapUsersApiEndpoints();

app.Run();
```

`AddUsersApiHandlers` comes from Immediate.Handlers; `MapUsersApiEndpoints` comes from Immediate.Apis.
Both are named from the [assembly identifier](/docs/concepts/assembly-identifier) — here, a project
named `Users.Api`.

## Where to next

<CardGrid cols={2}>
	<LinkCard
		title="Creating endpoints"
		description="Verb attributes, multiple routes, route constraints, and registration."
		href="/docs/Immediate.Apis/creating-endpoints"
	/>
	<LinkCard
		title="Binding request data"
		description="How the generator decides between [FromBody] and [AsParameters]."
		href="/docs/Immediate.Apis/binding-request-data"
	/>
	<LinkCard
		title="Authorization"
		description="[Authorize], [AllowAnonymous], and the policy-only restriction."
		href="/docs/Immediate.Apis/authorization"
	/>
	<LinkCard
		title="Customizing endpoints"
		description="CustomizeEndpoint, TransformResult, and metadata attributes."
		href="/docs/Immediate.Apis/customizing-endpoints"
	/>
	<LinkCard
		title="Route groups"
		description="Share a prefix and configuration across a set of endpoints."
		href="/docs/Immediate.Apis/route-groups"
	/>
	<LinkCard
		title="Tagged registration"
		description="Register a subset of your endpoints per host, per environment or per test."
		href="/docs/Immediate.Apis/tagged-registration"
	/>
	<LinkCard
		title="OpenAPI and Swagger"
		description="Unique schema IDs for nested request types, in Swashbuckle and in Microsoft.AspNetCore.OpenApi."
		href="/docs/Immediate.Apis/openapi"
	/>
	<LinkCard
		title="Attributes reference"
		description="Every attribute the generator reads, with its exact shape."
		href="/docs/Immediate.Apis/attributes-reference"
	/>
	<LinkCard
		title="How it works"
		description="The members the generator emits, including Route and Routes."
		href="/docs/Immediate.Apis/how-it-works"
	/>
	<LinkCard
		title="Diagnostics"
		description="IAPI0001–IAPI0013, their severities and their code fixes."
		href="/docs/Immediate.Apis/diagnostics"
	/>
</CardGrid>
