---
title: Assembly-wide Defaults
description: Assembly defaults and how duplicate registration strategies behave.
---

# {$frontmatter.title}

Use `RegistrationDefaults` to set assembly-wide defaults for registration behavior:

```cs |copy|title=AssemblyInfo.cs
using Immediate.Injections.Shared;

[assembly: RegistrationDefaults(
    DuplicateStrategy = DuplicateStrategy.Replace,
    RegistrationStrategy = RegistrationStrategy.Self,
    UseProxyFactory = true
)]
```

Only `DuplicateStrategy`, `RegistrationStrategy`, `UseProxyFactory` are supported; each has the same meaning as if they
were provided to the attribute applied on a class

```cs |copy|title=AssemblyDefaults.cs
using Immediate.Injections.Shared;

[assembly: RegistrationDefaults(
    DuplicateStrategy = DuplicateStrategy.Replace,
    RegistrationStrategy = RegistrationStrategy.ImplementedInterfaces,
    UseProxyFactory = true
)]

public interface IService;

[RegisterScoped] // will have the above defaults applied
public sealed class Service : IService;
```
