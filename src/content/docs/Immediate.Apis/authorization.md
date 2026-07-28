---
title: Authorization
description: Apply [Authorize] and [AllowAnonymous] to generated endpoints, and why only policy-based authorization is supported.
order: 4
group: Guides
---

Put `[Authorize]` or `[AllowAnonymous]` on the handler class and the generator applies the matching
convention to the generated endpoint.

## Requiring authorization

```csharp title="GetUsers.cs" {3}
[Handler]
[MapGet("/users")]
[Authorize]
public static partial class GetUsers
{
	// ...
}
```

This emits `endpoint.RequireAuthorization()` — the default policy, no arguments.

To require a named policy, pass it as the constructor argument or as the `Policy` named argument.
Both forms produce `endpoint.RequireAuthorization("UserManagement")`:

```csharp title="GetUsers.cs"
[Authorize("UserManagement")]

// equivalent
[Authorize(Policy = "UserManagement")]
```

Register the policy itself the usual ASP.NET Core way:

```csharp title="Program.cs"
builder.Services.AddAuthorizationBuilder()
	.AddPolicy("UserManagement", p => p.RequireRole("Admin"));
```

## Allowing anonymous access

```csharp title="GetHealth.cs" {3}
[Handler]
[MapGet("/health")]
[AllowAnonymous]
public static partial class GetHealth
{
	// ...
}
```

This emits `endpoint.AllowAnonymous()`, which is what you want when the surrounding group or the
`MapXxxEndpoints(...)` return value has already applied `RequireAuthorization()`.

## Only policy-based authorization is supported

`Roles`, `AuthenticationSchemes` and any other named argument on `[Authorize]` are **not** translated
to the endpoint. Using one is
[IAPI0002](/docs/Immediate.Apis/diagnostics#iapi0002), an **error**.

```csharp title="GetUsers.cs"
// IAPI0002: [Authorize] was used with invalid parameter Roles
[Authorize(Roles = "Admin")]
```

Note that the constructor form is checked first, so `[Authorize("UserManagement", Roles = "Admin")]`
still applies the `UserManagement` policy — while IAPI0002 fires for `Roles`.

## Using both attributes

If a class carries both `[Authorize]` and `[AllowAnonymous]`, **`[AllowAnonymous]` wins**: the
generator emits `AllowAnonymous()` and never emits `RequireAuthorization()`.
[IAPI0003](/docs/Immediate.Apis/diagnostics#iapi0003) warns about the combination.

```csharp title="GetUsers.cs"
[Handler]
[MapGet("/users")]
[Authorize("UserManagement")]
// IAPI0003: Both [AllowAnonymous] and [Authorize] were used,
// but only one will be applied to the endpoint
[AllowAnonymous]
public static partial class GetUsers
{
	// ...
}
```

This is a real hazard when a handler is edited over time: adding `[AllowAnonymous]` to a handler that
already had `[Authorize]` quietly opens the endpoint up. Treat IAPI0003 as an error in your build if
you can.

## Applying authorization to many endpoints at once

For a whole assembly, use the `RouteGroupBuilder` returned by `MapXxxEndpoints`:

```csharp title="Program.cs"
app.MapUsersApiEndpoints("/api")
	.RequireAuthorization("UserManagement");
```

For a subset, use a [route group](/docs/Immediate.Apis/route-groups) and apply the convention in its
`CustomizeGroup` method. In both cases individual endpoints can opt out with `[AllowAnonymous]`.
