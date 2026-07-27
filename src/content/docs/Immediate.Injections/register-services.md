---
title: RegisterServices attribute
description: Add services that require additional configuration.
order: 4
---

Apply this attribute to a `static void` method to have it called as part of `AddXxxServices`. The method must accept
`IServiceCollection` as its first parameter, and optionally `ReadOnlySpan<string>` as its second parameter to receive
the tags passed to `AddXxxServices`.

```csharp title="RegisterServices.cs"
public static class ManualRegistrations
{
    [RegisterServices]
    public static void Register(IServiceCollection services) { ... }

    // or, to receive tags:
    [RegisterServices]
    public static void RegisterWithTags(IServiceCollection services, ReadOnlySpan<string> tags) { ... }
}
```
