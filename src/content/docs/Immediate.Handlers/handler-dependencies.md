---
title: Handler dependencies
description: Choose between a static handler with method parameters and a sealed handler with a primary constructor.
order: 3
group: Guides
---

<script lang="ts">
	import { Callout, Tabs, TabItem } from '$lib/components/docs';
</script>

There are two ways to get services into a handler, and they are equivalent in behavior. The difference
is where you declare the dependencies and which class the container resolves them into.

<Tabs items={['Static handler', 'Sealed handler']}>
<TabItem label="Static handler">

Declare the class `static partial`, the handle method `private static`, and list dependencies as
parameters **between** the request and the cancellation token.

```csharp title="GetUsersQuery.cs"
[Handler]
public static partial class GetUsersQuery
{
	public sealed record Query;

	private static ValueTask<IEnumerable<User>> HandleAsync(
		Query query,
		UsersService usersService,
		ILogger<Query> logger,
		CancellationToken token
	)
	{
		logger.LogInformation("Fetching users");
		return usersService.GetUsers(token);
	}
}
```

Those extra parameters become constructor parameters of the generated `HandleBehavior`, which is what
DI actually constructs.

</TabItem>
<TabItem label="Sealed handler">

Declare the class `sealed partial` with a primary constructor, and give the handle method only the
request and the token.

```csharp title="GetUsersQuery.cs"
[Handler]
public sealed partial class GetUsersQuery(
	UsersService usersService,
	ILogger<GetUsersQuery> logger
)
{
	public sealed record Query;

	private ValueTask<IEnumerable<User>> HandleAsync(
		Query query,
		CancellationToken token
	)
	{
		logger.LogInformation("Fetching users");
		return usersService.GetUsers(token);
	}
}
```

The container class itself is registered in DI, and the generated `HandleBehavior` takes an instance of
it as its only constructor parameter.

</TabItem>
</Tabs>

## Which to use

Both are fully supported and neither is deprecated. Static handlers keep the class stateless and are
the more common style in existing code; sealed handlers read like ordinary services and are easier when
you have several dependencies or want to share them across private helper methods.

The analyzers nudge you toward whichever you have already started:

| Situation                                                          | Diagnostic                                      | Severity |
| ------------------------------------------------------------------ | ----------------------------------------------- | -------- |
| Static handle method, class not `static`                           | [IHR0018](/docs/Immediate.Handlers/diagnostics) | Warning  |
| Instance handle method, class not `sealed`                         | [IHR0016](/docs/Immediate.Handlers/diagnostics) | Warning  |
| Instance handle method, non-`private` instance member on the class | [IHR0017](/docs/Immediate.Handlers/diagnostics) | Warning  |
| Static handler that has dependencies                               | [IHR0019](/docs/Immediate.Handlers/diagnostics) | Info     |

[IHR0019](/docs/Immediate.Handlers/diagnostics) ships with a **Convert to instance handler**
code fix that rewrites the whole class for you: it drops `static` from the class and the method, adds a
primary constructor, and moves the dependency parameters into it.

## Widening IHR0019

By default IHR0019 only fires for a static handler that _has_ dependencies. Set the following in
`.editorconfig` to have it fire for every static handler, including dependency-free ones:

```text title=".editorconfig"
[*.cs]
dotnet_diagnostic.IHR0019.enable_when_handler_has_no_dependencies = true
```

<Callout type="note">

That same switch enables `MarkHandleMethodAsStaticSuppressor`, which suppresses CA1822
("Mark members as static") on handle methods. With the switch at its default of `false`, an instance
handle method with no dependencies will draw a CA1822 suggestion if you have that rule enabled.

</Callout>

## Keyed services and other parameter attributes

Attributes on the dependency parameters are copied verbatim onto the generated constructor parameter,
including their arguments. That makes keyed services work with no extra support in the generator:

```csharp title="GetReportQuery.cs"
[Handler]
public static partial class GetReportQuery
{
	public sealed record Query;

	private static ValueTask<Report> HandleAsync(
		Query query,
		[FromKeyedServices("reporting")] IDbConnection connection,
		CancellationToken token
	) => // ...
}
```

The generated `HandleBehavior` constructor becomes:

```csharp title="IH.Application.GetReportQuery.g.cs"
public HandleBehavior(
	[global::Microsoft.Extensions.DependencyInjection.FromKeyedServicesAttribute("reporting")]
	global::System.Data.IDbConnection connection
)
```

The same applies to any other parameter attribute you care to use. On a sealed handler, put the
attribute on the primary constructor parameter instead — that constructor is yours, so it is used as
written.

## Don't inject the container class

For a sealed handler, the container class is registered in DI, so it can be injected — but injecting it
bypasses the entire behavior pipeline. [IHR0022](/docs/Immediate.Handlers/diagnostics) warns
when a handler class appears as a parameter, field, property, return type or generic type argument:

```csharp
// warning IHR0022: Handler type 'GetUsersQuery' should not be used directly;
// use 'GetUsersQuery.Handler' instead
public sealed class Consumer(GetUsersQuery handler);
```

Use `GetUsersQuery.Handler` or `IHandler<GetUsersQuery.Query, IEnumerable<User>>` instead.
