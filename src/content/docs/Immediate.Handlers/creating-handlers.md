---
title: Creating handlers
description: Define a handler with the [Handler] attribute and a private Handle or HandleAsync method.
order: 2
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

A handler is a `partial class` annotated with `[Handler]` that contains exactly one handle method. The
generator emits a nested `Handler` class next to it that wires up the pipeline and resolves your
dependencies.

```csharp title="GetUsersQuery.cs"
using Immediate.Handlers.Shared;

namespace Application;

[Handler]
public static partial class GetUsersQuery
{
	public sealed record Query;

	private static ValueTask<IEnumerable<User>> HandleAsync(
		Query query,
		UsersService usersService,
		CancellationToken token
	)
	{
		return usersService.GetUsers(token);
	}
}
```

This generates `GetUsersQuery.Handler`, which:

- attaches every behavior that applies to this request and response pair
- receives `UsersService` and any other dependencies from DI
- implements `IHandler<GetUsersQuery.Query, IEnumerable<User>>`

## The rules

The generator and analyzers enforce a small, fixed shape.

**The class must be `partial`, and must not be nested inside another type.** A nested handler reports
[IHR0005](/docs/Immediate.Handlers/diagnostics) and no code is generated for it.

**There must be exactly one handle method**, named either `Handle` or `HandleAsync` — both names are
accepted and behave identically. Declaring both, or two overloads of either, reports
[IHR0010](/docs/Immediate.Handlers/diagnostics). Declaring neither reports
[IHR0001](/docs/Immediate.Handlers/diagnostics), which ships with an _Add HandleAsync method_
code fix.

**The handle method must be `private`** ([IHR0011](/docs/Immediate.Handlers/diagnostics)). It is
an implementation detail; consumers go through the generated `Handler`.

**The first parameter is the request** ([IHR0014](/docs/Immediate.Handlers/diagnostics) if it is
missing).

**The return type must be `ValueTask`, `ValueTask<TResponse>`, or `IAsyncEnumerable<TResponse>`.**

<Callout type="warning">

`Task` and `Task<T>` are **not** accepted and report
[IHR0002](/docs/Immediate.Handlers/diagnostics). If you are calling `Task`-returning code, mark
the handle method `async` and return `ValueTask<T>`.

</Callout>

## Commands and the implicit response

A handler that returns a bare `ValueTask` has no response type. The generator supplies
`System.ValueTuple` in its place, so the generated handler implements
`IHandler<Command, ValueTuple>`.

```csharp title="CreateUserCommand.cs"
[Handler]
public static partial class CreateUserCommand
{
	public sealed record Command(string Email);

	private static async ValueTask HandleAsync(
		Command command,
		UsersService usersService,
		CancellationToken token
	)
	{
		await usersService.CreateUser(command.Email, token);
	}
}
```

```csharp
public sealed class Consumer(CreateUserCommand.Handler handler)
{
	public async ValueTask Run(CancellationToken token) =>
		await handler.HandleAsync(new("user@example.com"), token);
}
```

## Cancellation tokens

A trailing `CancellationToken` parameter is optional, but omitting it reports the configurable warning
[IHR0012](/docs/Immediate.Handlers/diagnostics), because the request cannot then be cancelled.

```csharp title="GetHelloResponse.cs"
[Handler]
public static partial class GetHelloResponse
{
	public sealed record Query(string Name);

	private static ValueTask<string> Handle(Query query) =>
		ValueTask.FromResult($"Hello {query.Name}!");
}
```

The token must be the **last** parameter. On an instance handler, anything after it reports
[IHR0015](/docs/Immediate.Handlers/diagnostics). On a static handler there is no such error —
the generator simply stops recognising the token as a token and treats every parameter after the request
as a dependency to resolve from DI, including the `CancellationToken` itself.

## Request and response types

Nothing is enforced about the request and response types. They may be a `record`, `record struct`,
`class`, `sealed class` or `struct`; they may be nested inside the handler or declared anywhere else;
and they need not derive from any base type or implement any interface.

The `Query` / `Command` / `Response` naming used throughout these docs is convention only. It does have
one mechanical effect: the [IHR0001](/docs/Immediate.Handlers/diagnostics) code fix looks for
nested records whose names end in `Query`, `Command` or `Response` to infer the signature of the method
it generates.

<Callout type="tip">

Nesting the request and response inside the handler keeps a slice self-contained, but it produces types
named `MyApp.DeleteUser+Command`. If you also use Swashbuckle, see
[OpenAPI and Swashbuckle](/docs/Immediate.Handlers/openapi-and-swashbuckle).

</Callout>

## Consuming a handler

The concrete `X.Handler` is the direct route:

```csharp
public sealed class Consumer(GetUsersQuery.Handler handler)
{
	public async ValueTask<IEnumerable<User>> Run(CancellationToken token) =>
		await handler.HandleAsync(new GetUsersQuery.Query(), token);
}
```

When your project layout does not allow a reference from the consumer to the handler, depend on the
`IHandler<TRequest, TResponse>` abstraction instead — the generated handler is registered against it:

```csharp
public sealed class Consumer(IHandler<GetUsersQuery.Query, IEnumerable<User>> handler)
{
	public async ValueTask<IEnumerable<User>> Run(CancellationToken token) =>
		await handler.HandleAsync(new GetUsersQuery.Query(), token);
}
```

<Callout type="note">

If no concrete handler in the compilation implements the `IHandler<,>` you asked for,
[IHR0013](/docs/Immediate.Handlers/diagnostics) warns you at compile time rather than leaving
you with a DI resolution failure at startup.

</Callout>

Next: [Handler dependencies](/docs/Immediate.Handlers/handler-dependencies) covers the static versus
sealed-instance choice and how services reach your handle method.
