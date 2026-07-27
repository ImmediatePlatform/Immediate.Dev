---
title: Quickstart
description: Build and run a working Immediate.Handlers endpoint in about five minutes.
order: 3
---

<script lang="ts">
	import { Callout, Steps } from '$lib/components/docs';
</script>

This gets one handler running end to end, reachable over HTTP. For a fuller walkthrough that adds
one package per page, start the [tutorial](/docs/getting-started/tutorial/overview) instead.

<Steps>

### Create a new project

If you already have a .NET project you can skip this step.

```bash title="terminal"
dotnet new web -n MyApp
cd MyApp
```

### Add packages

```bash title="terminal"
dotnet add package Immediate.Handlers
dotnet add package Immediate.Apis
```

See [Installation](/docs/getting-started/installation) for the other packages and how they depend
on each other.

### Create your first handler

A handler is a partial class marked `[Handler]` containing exactly one `Handle` or `HandleAsync`
method. Everything else — the pipeline class, the DI registration, the endpoint — is generated.

📝 _<u>Note</u>_: to keep things simple this fakes the user. In a real application you would load
one from a database.

```csharp title="GetUserQuery.cs"
using Immediate.Apis.Shared;
using Immediate.Handlers.Shared;

namespace MyApp;

[Handler]
[MapGet("/api/users/{userId:int}")]
public static partial class GetUserQuery
{
	public sealed record Query
	{
		public required int UserId { get; init; }
	}

	public sealed record User(int UserId, string Username);

	private static ValueTask<User> HandleAsync(
		Query query,
		CancellationToken token
	)
	{
		var user = new User(query.UserId, "john");

		return ValueTask.FromResult(user);
	}
}
```

### Wire it up

Two calls: one to register the handlers with DI, one to map the endpoints. `MyApp` here is the
[assembly identifier](/docs/concepts/assembly-identifier), derived from your project name.

```csharp title="Program.cs" {5,9}
using MyApp;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyAppHandlers();

var app = builder.Build();

app.MapMyAppEndpoints();

app.Run();
```

### Run it

```bash title="terminal"
dotnet run
```

Then, from another terminal:

```bash title="terminal"
curl http://localhost:5000/api/users/42
# {"userId":42,"username":"john"}
```

That's a complete, running application. The `{UserId}` route parameter was bound to the `Query`
record automatically — see [Binding request data](/docs/Immediate.Apis/binding-request-data) for
the rules.

### Call the handler directly

You don't need HTTP to use a handler. Inject the generated `GetUserQuery.Handler` anywhere:

```csharp title="Consumer.cs"
public sealed class Consumer(GetUserQuery.Handler handler)
{
	public async Task ConsumeAsync(CancellationToken token)
	{
		var response = await handler.HandleAsync(
			new GetUserQuery.Query { UserId = 42 },
			token
		);

		// do something with response
	}
}
```

</Steps>

<Callout type="tip" title="Next steps">
The <a href="/docs/getting-started/tutorial/overview">tutorial</a> builds this out into a
complete Todo API — validation, caching and dependency injection, one package per page. Or jump
straight to <a href="/docs/Immediate.Handlers/creating-behaviors">behaviors</a> for cross-cutting
concerns like logging, or the <a href="/docs/cookbook/the-cookbook">cookbook</a> for ready-made
integration examples.
</Callout>
