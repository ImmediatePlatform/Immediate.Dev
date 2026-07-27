---
title: Tagged registration
description: Tag endpoints and route groups, then register only the ones you want at startup.
order: 7
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Tags let one assembly serve several hosts: a public API process registers the public endpoints, an
admin process registers the admin ones, and integration tests register whichever slice they exercise.
Declare tags on the attribute, and filter at the call site.

See [Tags and conditional registration](/docs/concepts/tags) for the semantics shared across
Immediate.Handlers, Immediate.Apis and Immediate.Injections.

## Tagging an endpoint

Every `Map` attribute has a `Tags` init-only property:

```csharp title="GetUsers.cs" {2}
[Handler]
[MapGet("/users", Tags = ["Public"])]
public static partial class GetUsers
{
	// ...
}
```

An endpoint may carry several tags:

```csharp
[MapDelete("/users/{id:int}", Tags = ["Admin", "Internal"])]
```

<Callout type="note">

`Tags` here is Immediate.Apis' registration filter. It is unrelated to ASP.NET Core's OpenAPI tags —
for those, call `WithTags(...)` from
[`CustomizeEndpoint`](/docs/Immediate.Apis/customizing-endpoints#customizeendpoint) or on the
`RouteGroupBuilder`.

</Callout>

## Tagging a route group

`[RouteGroup]` takes the same property. Tagging a group filters the group as a whole — including
every endpoint and child group beneath it:

```csharp title="Admin.cs" {1}
[RouteGroup("api/admin", Tags = ["Admin"])]
public sealed partial class Admin
{
	private static void CustomizeGroup(RouteGroupBuilder group)
		=> group.RequireAuthorization("Admin");
}
```

## Filtering at registration

Pass the tags you want after the prefix:

```csharp title="Program.cs"
// everything
app.MapUsersApiEndpoints();

// only untagged endpoints plus those tagged "Public"
app.MapUsersApiEndpoints("", "Public");

// mounted under /api, "Public" or "Internal"
app.MapUsersApiEndpoints("/api", "Public", "Internal");
```

The rules, which are easy to get backwards:

- **Passing no tags registers everything**, including endpoints and groups that _are_ tagged.
- **Untagged endpoints and groups are always registered**, whatever tags you pass. Tags are an
  opt-in filter on tagged items, not an allow-list for all of them.
- An item matches if it shares **at least one** tag with the arguments.
- Matching is **ordinal string comparison** — case-sensitive, no wildcards.

The generated code makes this literal:

```csharp
if (tags is [] || Intersects(tags, ["Public"]))
{
	Users.GetUsers.MapEndpoint(group);
}

// untagged endpoints are emitted with no guard at all
Users.GetHealth.MapEndpoint(group);
```

## Tags flow down through groups

`MapXxxEndpoints` passes its `tags` argument into every group's generated `MapGroup` method, and each
group passes it on to its children. A tag check therefore happens at each level:

- If a **group** is tagged and does not match, the whole subtree is skipped — its endpoints are never
  considered.
- If a group matches (or is untagged), each **endpoint** inside it is still checked against its own
  tags.

So an endpoint tagged `"Admin"` inside a group tagged `"Public"` is registered only when you pass
both `"Public"` and `"Admin"` — or no tags at all.

<Callout type="tip">

Immediate.Handlers has its own tag filter on `AddXxxHandlers(...)`, and the handler is what the
generated endpoint resolves from DI. If you filter endpoints by tag, filter handlers with the same
tags, or you will register endpoints whose `Handler` cannot be resolved at request time.

</Callout>
