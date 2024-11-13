---
title: Creating behaviors
---

# {$frontmatter.title}

Pipeline behaviors allow you to inject your own logic around the handling of requests, which lets you build a pipeline to address common cross-cutting concerns such as logging, validation etc. In fact, `Immediate.Validations` performs its validation of your queries and commands by using a behavior.

You can think of behaviors as akin to filters known from ASP.NET Core.

## Creating a behavior

Behaviors can be created by implementing the `Immediate.Handlers.Shared.Behaviors<,>` class, as so:

```cs
public sealed class LoggingBehavior<TRequest, TResponse>(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
	: Behavior<TRequest, TResponse>
{
	public override async ValueTask<TResponse> HandleAsync(TRequest request, CancellationToken cancellationToken)
	{
		logger.LogInformation("LoggingBehavior.Enter");
		var response = await Next(request, cancellationToken);
		logger.LogInformation("LoggingBehavior.Exit");
		return response;
	}
}
```

This can be registered assembly-wide using:

```cs
[assembly: Behaviors(
	typeof(LoggingBehavior<,>)
)]
```

or on an individual handler using:

```cs
[Handler]
[Behavior(
	typeof(LoggingBehavior<,>)
)]
public static class GetUsersQuery
{
	// ..
}
```

Once added to the pipeline, the behavior will be called as part of the pipeline to handle a request.

:::admonition type="note"
Adding a `[Behavior]` attribute to a handler will disregard all assembly-wide behaviors for that handler, so any
global behaviors necessary must be independently added to the handler override behaviors list.
:::

## Behavior Constraints

A constraint can be added to a behavior by using:

```cs
public sealed class LoggingBehavior<TRequest, TResponse>
	: Behavior<TRequest, TResponse>
	where TRequest : IRequestConstraint
	where TResponse : IResponseConstraint
```

When a pipeline is generated, all potential behaviors are evaluated against the request and response types, and if
either type does not match a given constraint, the behavior is not added to the generated pipeline.

## Registering with `IServiceCollection`

Immediate.Handlers supports `Microsoft.Extensions.DependencyInjection.Abstractions` directly. To register behaviors with DI, simply add the following to your `Program.cs`:

In your `Program.cs`, add a call to `services.AddXxxBehaviors()`, where `Xxx` is the shortened form of the project name.
* For a project named `Web`, it will be `services.AddWebBehaviors()`
* For a project named `Application.Web`, it will be `services.AddApplicationWebBehaviors()`

This registers all behaviors referenced in any `[Behaviors]` attribute.
