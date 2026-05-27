---
title: Attributes
description: Reference for `RegisterSingleton`, `RegisterScoped`, `RegisterTransient` and `RegistrationDefaults`.
---

# {$frontmatter.title}

Immediate.Injections provides attributes to mark classes for registration and options to control how they are registered.

## Registration Attributes

- `RegisterSingleton`: registers the type as a singleton.
- `RegisterScoped`: registers the type as scoped.
- `RegisterTransient`: registers the type as transient.


## Properties:

- `ServiceKey`: optional key for keyed registrations.
- `Factory`: name of static factory method on the type.
- `DuplicateStrategy`: how duplicates are handled (`Append`, `Skip`, `Replace`).
- `RegistrationStrategy`: what to register (`Self`, `ImplementedInterfaces`, etc.).
- `Tags`: optional string tags to filter registrations.

```cs |copy|title=MyService.cs
using Immediate.Injections.Shared;

[RegisterSingleton(ServiceKey = "MyKey", Factory = "Create", DuplicateStrategy = DuplicateStrategy.Replace)]
public class MyService : IMyService
{
    // Factory method example
    public static MyService Create()
    {
        return new MyService();
    }
}
```

