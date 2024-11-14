---
title: Creating a cache
description: Learn how to create a cache to use with your handler
---

# {$frontmatter.title}

Create a subclass of `ApplicationCacheBase`, which will serve as the cache for a particular handler. An example:
```cs
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

public sealed class GetValueCache(
	IMemoryCache memoryCache,
	Owned<IHandler<GetValue.Query, GetValue.Response>> ownedHandler
) : ApplicationCacheBase<GetValue.Query, GetValue.Response>(
	memoryCache,
	ownedHandler
)
{
	protected override string TransformKey(GetValue.Query request) =>
		$"GetValue(query: {request.Value})";
}
```

In this case, the `GetValueCache` class will serve as a cache for the `GetValue` IH handler.

## Register the Cache with DI

In your `Program.cs` file:

* Ensure that Memory Cache is registered, by calling:
```cs
services.AddMemoryCache();
```

* Register `Owned<>` as a singleton
```cs
services.AddSingleton(typeof(Owned<>));
```

* Register your cache service(s) as a singleton(s)
```cs
services.AddSingleton<GetValueCache>();
```

## Retrieve Data From the Cache

Using an instance of the `GetValueCache` class that you have created above, you can simply call:
```cs
var response = await cache.GetValue(request, token);
```

If there is a cached value, it will be returned; otherwise a temporary scope will be used to create the handler and
execute it; and the returned value will be stored.

> [!NOTE]
> If simultaneous requests are made while the handler is executing, they will wait for the first handler to
complete, rather than executing the handler a second/simultaenous time.

## Removing Data From the Cache

Using an instance of the `GetValueCache` class that you have created above, you can remove cached data by calling:
```cs
await cache.RemoveValue(request);
```

> [!NOTE]
> If a handler is running based on this request, it will be cancelled, and any callers waiting on the results from 
> this handler will experience a `CancellationToken` cancellation.

## Updating Data In the Cache

Using an instance of the `GetValueCache` class that you have created above, you can assign cached data by calling:
```cs
await cache.SetValue(request, response);
```

> [!NOTE]
> If a handler is running based on this request, it will be cancelled, and any callers waiting on the results from 
> this handler will immediately receive the updated response.
