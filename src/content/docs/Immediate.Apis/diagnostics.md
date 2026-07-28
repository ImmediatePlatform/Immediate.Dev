---
title: Diagnostics
description: Every IAPI diagnostic Immediate.Apis reports, what triggers it, and how to fix it.
order: 11
group: Diagnostics
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Apis ships twelve diagnostics across eleven analyzers, plus four code fixes. Every
diagnostic uses the category `ImmediateApis` and the prefix `IAPI`. Titles below are the ones the
analyzers report verbatim.

| ID                    | Title                                                | Severity | Code fix |
| --------------------- | ---------------------------------------------------- | -------- | -------- |
| [IAPI0001](#iapi0001) | `[Handler]` must be used                             | Error    | Yes      |
| [IAPI0002](#iapi0002) | Must use `Policies` parameter for `[Authorize]`      | Error    | No       |
| [IAPI0003](#iapi0003) | Only use one of `[AllowAnonymous]` and `[Authorize]` | Warning  | No       |
| [IAPI0004](#iapi0004) | `CustomizeEndpoint` requires a specific definition   | Warning  | No       |
| [IAPI0005](#iapi0005) | `TransformResult` requires a specific definition     | Warning  | No       |
| [IAPI0006](#iapi0006) | Missing `CustomizeEndpoint` method                   | Hidden   | Yes      |
| [IAPI0007](#iapi0007) | Missing `TransformResult` method                     | Hidden   | Partial  |
| [IAPI0008](#iapi0008) | Handler should not depend on an endpoint handler     | Info     | No       |
| [IAPI0009](#iapi0009) | Endpoint has been specified multiple times           | Warning  | No       |
| [IAPI0010](#iapi0010) | _Removed in release 6.0_                             | —        | —        |
| [IAPI0011](#iapi0011) | `CustomizeGroup` requires a specific definition      | Warning  | No       |
| [IAPI0012](#iapi0012) | Missing `CustomizeGroup` method                      | Hidden   | Yes      |
| [IAPI0013](#iapi0013) | `MapGroup<>` target must be a valid Route Group      | Error    | No       |

Hidden diagnostics never appear in build output. They exist so your IDE can offer the matching
refactoring in the lightbulb menu.

## Errors

### IAPI0001

**`[Handler]` must be used.** A class carries a `Map` attribute but not `[Handler]`.

> Handler `GetUsers` must be marked with [Handler]

Immediate.Apis can only generate a registration for an Immediate.Handlers handler — the generated
delegate resolves `GetUsers.Handler` from DI, and that type only exists if `[Handler]` is present.

**Code fix:** _Add [Handler] attributes_, which inserts `[Handler]` above the class and adds the
`using`.

```csharp
[Handler] // ← added by the code fix
[MapGet("/users")]
public static partial class GetUsers
{
	// ...
}
```

### IAPI0002

**Must use `Policies` parameter for `[Authorize]`.** `[Authorize]` was used with a named argument
other than `Policy`. (The title says `Policies`; the property the analyzer accepts is `Policy`.)

> [Authorize] was used with invalid parameter Roles

`Roles`, `AuthenticationSchemes` and any other named argument are not translated into an endpoint
convention. Worse, if the attribute has _only_ named arguments and one of them is unsupported, the
generator abandons the handler entirely and the endpoint is never registered.

Express the requirement as a policy instead:

```csharp title="Program.cs"
builder.Services.AddAuthorizationBuilder()
	.AddPolicy("Admin", p => p.RequireRole("Admin"));
```

```csharp title="DeleteUser.cs"
[Authorize("Admin")]
```

See [Authorization](/docs/Immediate.Apis/authorization).

### IAPI0013

**`MapGroup<>` target must be a valid Route Group.** The type argument of `[MapGroup<T>]` does not
carry `[RouteGroup]`.

> Target `Users` in `[MapGroup<Users>]` must be a Route Group

The endpoint is not generated at all while this is unresolved. Add `[RouteGroup("prefix")]` to the
target class, or point the attribute at a class that has it.

<Callout type="note">

IAPI0013 is marked `NotConfigurable`, so its severity cannot be lowered from an `.editorconfig`.

</Callout>

See [Route groups](/docs/Immediate.Apis/route-groups).

## Warnings

### IAPI0003

**Only use one of `[AllowAnonymous]` and `[Authorize]`.** Both are present on the same class.

> Both [AllowAnonymous] and [Authorize] were used, but only one will be applied to the endpoint

`[AllowAnonymous]` wins: the generator emits `AllowAnonymous()` and never emits
`RequireAuthorization(...)`. Remove whichever attribute is not intended. Because the failure mode is
an endpoint that is open when you believe it is protected, this is a good candidate for
`dotnet_diagnostic.IAPI0003.severity = error`.

See [Authorization](/docs/Immediate.Apis/authorization).

### IAPI0004

**`CustomizeEndpoint` requires a specific definition.** A method named `CustomizeEndpoint` exists but
does not match the shape the generator looks for, so it is silently ignored.

> `CustomizeEndpoint` must be `internal static void CustomizeEndpoint(RouteHandlerBuilder endpoint)`

The accepted shape is broader than the message says: accessibility may be `internal` **or**
`private`, and the parameter may be `RouteHandlerBuilder` **or** `IEndpointConventionBuilder`. It
must be `static`, return `void`, and take exactly one parameter. Declaring two `CustomizeEndpoint`
overloads on one class reports the diagnostic on every one of them, even if one is otherwise valid.

The diagnostic is tagged `Unnecessary`, so your IDE also fades the method out.

See [Customizing endpoints](/docs/Immediate.Apis/customizing-endpoints#customizeendpoint).

### IAPI0005

**`TransformResult` requires a specific definition.** A method named `TransformResult` exists but does
not match, so it is ignored and the raw handler response is returned.

> `TransformResult` must be `internal` and `static`, and accept the value that `HandleAsync` returns

Requirements: `internal` (not `private`, not `public`), `static`, a non-`void` return type, and
either

- exactly one parameter whose type equals the `T` in the handler's `ValueTask<T>`, compared
  **including nullability annotations**; or
- no parameters at all, when the handler returns a bare `ValueTask`.

A `ValueTask<User?>` handler needs `TransformResult(User? result)`; `TransformResult(User result)`
reports IAPI0005.

See [Customizing endpoints](/docs/Immediate.Apis/customizing-endpoints#transformresult).

### IAPI0009

**Endpoint has been specified multiple times.** Two or more handlers register the same HTTP verb and
route within the same route group.

> Endpoint `GET /users` has been specified multiple times: GetUsers, ListUsers

The diagnostic is reported on every conflicting `Map` attribute, and the message names all of the
classes involved. Route groups are part of the identity, so the same route in two different groups is
not a conflict.

This is a `CompilationEnd` diagnostic: it can only be computed once every type in the compilation has
been seen, so it appears on a full build rather than as you type.

Which registration wins at runtime is ASP.NET Core's business, and generally an ambiguous-match
exception at request time. Fix the duplicate rather than relying on ordering.

### IAPI0011

**`CustomizeGroup` requires a specific definition.** A `[RouteGroup]` class has a `CustomizeGroup`
method with the wrong shape; it is ignored.

> `CustomizeGroup` must be `private static void CustomizeEndpoint(RouteGroupBuilder group)`

The required shape is `private static void CustomizeGroup(RouteGroupBuilder group)`. Note that
`internal` is accepted for `CustomizeEndpoint` but **not** here — `private` only.

<Callout type="warning">

The diagnostic message has a copy/paste error: it says `CustomizeEndpoint` where it means
`CustomizeGroup`. The method the generator looks for is `CustomizeGroup`.

</Callout>

See [Route groups](/docs/Immediate.Apis/route-groups#customizing-a-group).

## Informational

### IAPI0008

**Handler should not depend on an endpoint handler.** A handler's constructor or `Handle` method takes
a parameter of type `X.Handler` where `X` is a static class carrying both `[Handler]` and a `Map`
attribute.

> Type `GetUsers` is an endpoint handler and should not be consumed by another handler

An endpoint handler is an entry point into your application from the outside. Reusing it internally
couples the caller to an HTTP-shaped contract, and any endpoint-level concerns you add later — new
authorization, new response shape — silently change the internal call too.

Extract the shared logic into a service, or into a handler that has no `Map` attribute, and call that
from both places.

## Hidden

These three never surface in the build. They exist so the IDE can offer a refactoring.

### IAPI0006

**Missing `CustomizeEndpoint` method.** Reported on every endpoint class with no method named
`CustomizeEndpoint`.

**Code fix:** _Add `CustomizeEndpoint` method_, which inserts

```csharp
private static void CustomizeEndpoint(RouteHandlerBuilder endpoint)
{
}
```

as the first member of the class, adding the `using` for `Microsoft.AspNetCore.Builder`.

### IAPI0007

**Missing `TransformResult` method.** Reported on every endpoint class that has a `Handle`/`HandleAsync`
method and no method named `TransformResult`.

**Code fix:** _Add `TransformResult` method_, which inserts an identity transform derived from the
handler's return type:

```csharp
internal static IReadOnlyList<User> TransformResult(IReadOnlyList<User> result)
{
	return result;
}
```

<Callout type="warning" title="The code fix does nothing for command handlers">

The fix reads the type argument out of the handler's `ValueTask<T>` return type. If the handler
returns a bare `ValueTask` there is no type argument, and the provider returns the document
unchanged — the lightbulb entry appears, you click it, and nothing happens.

</Callout>

For a bare-`ValueTask` handler, write the parameterless form by hand:

```csharp
internal static NoContent TransformResult() => TypedResults.NoContent();
```

### IAPI0012

**Missing `CustomizeGroup` method.** Reported on every `[RouteGroup]` class with no method named
`CustomizeGroup`.

**Code fix:** _Add `CustomizeGroup` method_, which inserts

```csharp
private static void CustomizeGroup(RouteGroupBuilder group)
{
}
```

adding the `using` for `Microsoft.AspNetCore.Routing`. The fix also converts a semicolon-bodied class
declaration into a braced one.

## Removed

### IAPI0010

**`IAPI0010InvalidRouteGroupName` was removed in release 6.0.** It validated that a route group name
was a valid C# identifier, back when groups were named by string rather than by type.

Nothing reports it today. If you find `IAPI0010` in an old suppression list or `.editorconfig`, the
entry is dead and can be deleted. `[MapGroup<T>]` now takes a type argument, so an invalid group name
is a compile error from the C# compiler, and an invalid group _target_ is
[IAPI0013](#iapi0013).
