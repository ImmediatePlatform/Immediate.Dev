---
title: Registering Services
description: Annotate classes and call the generated registration extension to register services.
---

# {$frontmatter.title}

Services can be marked for registration using the `RegisterScoped`, `RegisterSingleton`, or `RegisterTransient`
attributes. These attributes support various options to control how the service is registered (e.g. which interfaces,
duplicate handling, factories, tags).

```cs |copy|title=Service.cs
using Immediate.Injections.Shared;

public interface IService { }

[RegisterScoped<IService>]
public class Service : IService
{
}
```

### Adding declared registrations to the `IServiceCollection` collection

In your `Program.cs`, add a call to `services.AddXxxServices()`, where Xxx is the application identifier. By default,
this is the short form of the assembly name. For example:

* For a project named `Web`, it will be `services.AddWebServices()`
* For a project named `Application.Web`, it will be `services.AddApplicationWebServices()`

However, this name can be overridden using `[assembly: ImmediateAssemblyIdentifierAttribute("SomeIdentifier")]`.
