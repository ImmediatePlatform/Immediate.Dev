---
title: Registering Services
description: Annotate classes and call the generated registration extension to register services.
---

# {$frontmatter.title}

Services can be marked for registration using the `RegisterScoped`, `RegisterSingleton`, or `RegisterTransient` attributes. These attributes support various options to control how the service is registered (e.g. which interfaces, duplicate handling, factories, tags).

```cs |copy|title=Service.cs
using Immediate.Injections.Shared;

public interface IService { }

[RegisterScoped<IService>]
public class Service : IService
{
}
```

## Add Generated Extension

In your `Program.cs` file:

```cs
services.AddXxxServices();
```