---
title: Quickstart
description: Get up and running with ImmediatePlatform libraries
order: 2
---

<script lang="ts">
	import { Steps } from '$lib/components/docs';
</script>

<Steps>

### Create a new project

If you already have a .NET project you can skip this step.

```bash title="terminal"
dotnet new web -n MyApp
cd MyApp
```

### Add packages

Add the ImmediatePlatform packages as dependencies to your project.

```bash title="terminal"
dotnet add package Immediate.Handlers

# Optional:
dotnet add package Immediate.Validations
dotnet add package Immediate.Apis
dotnet add package Immediate.Cache
```

### Register with DI

Register Immediate.Handlers services with dependency injection.

```csharp title="Program.cs" {2}
var builder = WebApplication.CreateBuilder();

builder.Services.AddMyAppHandlers();

var app = builder.Build();
app.Run();
```

### Create your first handler

Create your first handler that will accept a User ID and return a user.

📝 _<u>Note</u>_: In this example, to keep things simple, we will fake the user. In a real application, you would likely load a user from a database.

```csharp title="GetUserQuery.cs"
[Handler]
public static partial class GetUserQuery
{
	public sealed record Query
	{
		public int UserId { get; set; }
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

You can now call the handler like so:

```csharp title="Consumer.cs"
public sealed class Consumer(GetUserQuery.Handler handler)
{
	public async Task ConsumeAsync(CancellationToken token)
	{
		var response = await handler.HandleAsync(new("John"), token);
		// do something with response
	}
}
```

### (Optional) Turn your handler into an endpoint

If you have opted to install Immediate.Apis you can easily turn your handler into an API endpoint.

First modify your `Program.cs` to register the Immediate.Apis endpoints, like so:

```csharp title="Program.cs" {5-6}
var builder = WebApplication.CreateBuilder();

builder.Services.AddMyAppHandlers();

var app = builder.Build();

// <MyApp> here will be the name of your project
app.MapMyAppEndpoints();

app.Run();
```

Then modify the handler like so:

```csharp title="GetUserQuery.cs" {2}
[Handler]
[MapGet("/api/users/{UserId}")]
public static partial class GetUserQuery
{
	// ...
}
```

</Steps>

Keep reading the docs to learn about addressing cross-cutting concerns like logging with behaviors, validating the queries and commands with Immediate.Validations and more! You can also check out our cookbook for complete, ready-made examples.
