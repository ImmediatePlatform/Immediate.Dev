---
title: Creating a cache
description: Learn how to create a cache to use with your handler
---

# {$frontmatter.title}

Create a class and apply the `[CacheFor<>]` attribute, targeting a handler. Add a `TransformKey` method to transform a
request into a cache key. For example:

```cs |copy|title=GetValueCache.cs
[Handler]
public static partial class GetValue
{
	public sealed record Query(int Value);
	public sealed record Response(int Value);

	private static ValueTask<Response> HandleAsync(
		Query query,
		CancellationToken _
	) => ValueTask.FromResult(new Response(query.Value));
}

[CacheFor<GetValue>]
public sealed class GetValueCache
{
	protected override string TransformKey(GetValue.Query request) =>
		$"GetValue(query: {request.Value})";
}
```

In this case, the `GetValueCache` class will serve as a cache for the `GetValue` IH handler.

### Adding generated caches to the `IServiceCollection` collection

In your `Program.cs`, add a call to `services.AddXxxCaches()`, where Xxx is the application identifier. By default,
this is the short form of the assembly name. For example:

* For a project named `Web`, it will be `services.AddWebCaches()`
* For a project named `Application.Web`, it will be `services.AddApplicationWebCaches()`

However, this name can be overridden using `[assembly: ImmediateAssemblyIdentifierAttribute("SomeIdentifier")]`.

## Retrieve Data From the Cache

Using an instance of the `GetValueCache` class that you have created above, you can simply call:
```cs
var response = await cache.GetValue(request, token);
```

If there is a cached value, it will be returned; otherwise a temporary scope will be used to create the handler and
execute it; and the returned value will be stored.

:::admonition type="note"
If simultaneous requests are made while the handler is executing, they will wait for the first handler to
complete, rather than executing the handler a second/simultaenous time.
:::

## Removing Data From the Cache

Using an instance of the `GetValueCache` class that you have created above, you can remove cached data by calling:
```cs
await cache.RemoveValue(request);
```

:::admonition type="note"
If a handler is running based on this request, it will be cancelled, and any callers waiting on the results from this handler will experience a `CancellationToken` cancellation.
:::

## Updating Data In the Cache

Using an instance of the `GetValueCache` class that you have created above, you can assign cached data by calling:
```cs
await cache.SetValue(request, response);
```

:::admonition type="note"
If a handler is running based on this request, it will be cancelled, and any callers waiting on the results from this handler will immediately receive the updated response.
:::
