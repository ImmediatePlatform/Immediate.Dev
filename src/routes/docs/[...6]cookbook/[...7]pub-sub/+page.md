---
title: Publish-Subscribe pattern
description: Cookbook example showing how to implement the publish-subscribe pattern
---

# {$frontmatter.title}

If you are coming from other popular mediator libraries, you may be looking for a way to implement the
[publish-subscribe pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/publisher-subscriber)
with Immediate.Handlers. A common use case is implementing domain events.

Immediate.Handlers fully supports this pattern, but it intentionally does not provide a built-in `Publisher`
abstraction. Maintaining an opinionated publish-subscribe implementation is out of scope and would limit
the flexibility required by different projects.

An example is provided here of a simple `Publisher` which works for many cases.

```cs
public sealed class Publisher<TNotification>(
    IServiceProvider serviceProvider
)
{
    public async ValueTask Publish(TNotification notification)
    {
        foreach (var handler in serviceProvider.GetServices<IHandler<TNotification, ValueTuple>>())
        {
            await handler.Handle(notification);
        }
    }
}
````

Finally, this implementation can simply be registered as singleton service:
```cs
services.AddSingleton(typeof(Publisher<>));
```
