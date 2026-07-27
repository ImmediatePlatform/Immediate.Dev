---
title: Attributes reference
description: Every attribute Immediate.Apis defines or recognises, with its exact shape and effect.
order: 9
group: Reference
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Immediate.Apis defines its attributes in the `Immediate.Apis.Shared` namespace. It also recognises a
handful of attributes from ASP.NET Core and from Immediate.Handlers.

| Attribute                     | Target                | Effect                                           |
| ----------------------------- | --------------------- | ------------------------------------------------ |
| `[MapGet]`                    | class                 | Registers a `GET` endpoint                       |
| `[MapPost]`                   | class                 | Registers a `POST` endpoint                      |
| `[MapPut]`                    | class                 | Registers a `PUT` endpoint                       |
| `[MapPatch]`                  | class                 | Registers a `PATCH` endpoint                     |
| `[MapDelete]`                 | class                 | Registers a `DELETE` endpoint                    |
| `[MapMethod]`                 | class                 | Registers an endpoint for an arbitrary HTTP verb |
| `[RouteGroup]`                | class                 | Declares a route group                           |
| `[MapGroup<T>]`               | class                 | Attaches an endpoint to route group `T`          |
| `[Handler]`                   | class                 | Required; from Immediate.Handlers                |
| `[Authorize]`                 | class                 | Applies `RequireAuthorization()`                 |
| `[AllowAnonymous]`            | class                 | Applies `AllowAnonymous()`                       |
| `[AsParameters]`, `[FromXxx]` | parameter or property | Controls request binding                         |

## `MapMethodAttribute`

The base type of all the verb attributes, and usable directly for verbs that have no dedicated
attribute.

```csharp
public class MapMethodAttribute : Attribute
{
	public MapMethodAttribute(string method, [StringSyntax("Route")] params string[] routes);

	public string[] Routes { get; }
	public string Method { get; }
	public string[]? Tags { get; init; }
}
```

- **`method`** — the HTTP verb, emitted verbatim into `MapMethods(app, route, ["HEAD"], …)`.
- **`routes`** — one or more route templates. One endpoint registration is generated per route.
- **`Tags`** — optional registration tags; see
  [Tagged registration](/docs/Immediate.Apis/tagged-registration).

```csharp
[Handler]
[MapMethod("HEAD", "/api/health", "/health", Tags = ["Public"])]
public static partial class HeadHealth
{
	// ...
}
```

<Callout type="warning" title="[MapMethod] does not participate in verb-based body binding">

The binding inference special-cases `[MapPost]`, `[MapPut]` and `[MapPatch]` by attribute type, not
by verb string, so `[MapMethod("POST", …)]` binds `[AsParameters]`. See
[Binding request data](/docs/Immediate.Apis/binding-request-data).

</Callout>

<Callout type="note" title="The obsolete two-string constructor">

`MapMethodAttribute` also carries `MapMethodAttribute(string route, string method)` — note the
reversed argument order. It is `[Obsolete]`, hidden from IntelliSense with
`[EditorBrowsable(Never)]`, and deprioritised with `[OverloadResolutionPriority(-1)]`, so new source
always binds to the current overload. It exists only for binary compatibility; do not use it.

</Callout>

## The verb attributes

`MapGetAttribute`, `MapPostAttribute`, `MapPutAttribute`, `MapPatchAttribute` and
`MapDeleteAttribute` are sealed subclasses of `MapMethodAttribute` that supply the verb for you:

```csharp
public sealed class MapGetAttribute(
	[StringSyntax("Route")] params string[] routes
) : MapMethodAttribute("GET", routes)
{
	public MapGetAttribute(string route) : this([route]) { }
}
```

They inherit `Routes`, `Method` and `Tags`. Each also has a single-string constructor, so
`[MapGet("/users")]` works on language versions without collection expressions.

```csharp
[MapGet("/users")]
[MapGet("/api/users", "/v1/users")]
[MapGet("/users", Tags = ["Public", "Admin"])]
```

`[AttributeUsage(AttributeTargets.Class)]` — endpoints are declared on the handler class, never on
the `Handle` method. The generator reads the first `Map` attribute it finds, so only one per class is
meaningful.

## `RouteGroupAttribute`

```csharp
[AttributeUsage(AttributeTargets.Class)]
public sealed class RouteGroupAttribute([StringSyntax("route")] string route) : Attribute
{
	public string Route { get; }
	public string[]? Tags { get; init; }
}
```

- **`route`** — a single route prefix. Unlike the `Map` attributes, this is _not_ a `params` array.
- **`Tags`** — filters the entire group, including its endpoints and child groups.

The class must be `partial`; the generator adds a `MapGroup` method to it. A `[RouteGroup]` class
nested inside another `[RouteGroup]` class becomes a child group. See
[Route groups](/docs/Immediate.Apis/route-groups).

## `MapGroupAttribute<T>`

```csharp
[AttributeUsage(AttributeTargets.Class)]
public sealed class MapGroupAttribute<T> : Attribute;
```

Attaches the endpoint to route group `T`. `T` must carry `[RouteGroup]` or
[IAPI0013](/docs/Immediate.Apis/diagnostics#iapi0013) is reported and no endpoint is generated. Name
the _innermost_ group when groups are nested:

```csharp
[Handler]
[MapGet("")]
[MapGroup<Api.V1.Users>]
public static partial class GetUsers
{
	// ...
}
```

An endpoint carrying `[MapGroup<T>]` is not registered by `MapXxxEndpoints()` directly — only through
its group.

## Recognised ASP.NET Core attributes

### `[Authorize]` and `[AllowAnonymous]`

From `Microsoft.AspNetCore.Authorization`, applied to the handler class.

| Form                             | Generated                        |
| -------------------------------- | -------------------------------- |
| `[Authorize]`                    | `RequireAuthorization()`         |
| `[Authorize("Policy")]`          | `RequireAuthorization("Policy")` |
| `[Authorize(Policy = "Policy")]` | `RequireAuthorization("Policy")` |
| `[AllowAnonymous]`               | `AllowAnonymous()`               |

Any other named argument, such as `Roles` or `AuthenticationSchemes`, is
[IAPI0002](/docs/Immediate.Apis/diagnostics#iapi0002). If both attributes are present,
`[AllowAnonymous]` wins and [IAPI0003](/docs/Immediate.Apis/diagnostics#iapi0003) warns. See
[Authorization](/docs/Immediate.Apis/authorization).

### Binding attributes

`[AsParameters]` (from `Microsoft.AspNetCore.Http`) and `[FromBody]`, `[FromForm]`, `[FromHeader]`,
`[FromQuery]` and `[FromRoute]` (from `Microsoft.AspNetCore.Mvc`) are read in two positions:

- On the **request parameter** of `Handle`/`HandleAsync`, where they override the inference entirely.
- On a **property of the request type**, where any of the `[FromXxx]` five causes the request to bind
  as `[AsParameters]`.

`[FromServices]` and `[FromKeyedServices]` are not part of this set — handler dependencies are
resolved by Immediate.Handlers, not by the endpoint. See
[Binding request data](/docs/Immediate.Apis/binding-request-data).

### Metadata attributes on the handle method

Any attribute on `Handle`/`HandleAsync` — `[ProducesResponseType<T>]`, `[Produces]`, `[Tags]`,
`[EndpointSummary]`, your own — is copied verbatim onto the generated minimal-API delegate,
constructor and named arguments included. See
[Customizing endpoints](/docs/Immediate.Apis/customizing-endpoints#attributes-on-the-handle-method).

## Recognised methods

These are not attributes, but the generator looks for them by name and shape on your class:

| Method              | Required shape                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `CustomizeEndpoint` | `internal`/`private` `static void`, taking `RouteHandlerBuilder` or `IEndpointConventionBuilder`                    |
| `TransformResult`   | `internal static`, non-`void`, taking the handler's response type — or no parameters for a bare `ValueTask` handler |
| `CustomizeGroup`    | `private static void`, taking `RouteGroupBuilder`                                                                   |

A method with the right name and the wrong shape is ignored and reported: IAPI0004, IAPI0005 and
IAPI0011 respectively.
