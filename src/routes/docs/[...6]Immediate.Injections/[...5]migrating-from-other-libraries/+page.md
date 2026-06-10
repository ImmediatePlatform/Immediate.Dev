---
title: Migrating From Other Libraries
description: Providing shortcuts for migrating from other MSDI source-generated libraries.
---

# {$frontmatter.title}

### From Injectio

> [!NOTE]
> Immediate.Injections uses a different default registration strategy than Injectio. For a clean migration, set
> `[assembly: RegistrationDefaults(RegistrationStrategy = RegistrationStrategy.SelfAndImplementedInterfaces, UseProxyFactory = true)]`

* The `Tags` parameter receives a `string[]` instead of a comma-separated `string`. Example: `Tags = "foo,bar"` becomes `Tags = ["foo", "bar"]`
* The `RegistrationStrategy.SelfWithInterfaces` enum value changes to `RegistrationStrategy.SelfAndImplementedInterfaces`
* The `Registration` parameter changes to `RegistrationStrategy`
* The `Duplicate` parameter becomes `DuplicateStrategy`
* Assembly name override moves from MSBuild property to `[ImmediateAssemblyIdentifier]` attribute

### From AutoRegisterInject

> [!NOTE]
> Immediate.Injections uses a different default registration strategy than Injectio. For a clean migration, set
> `[assembly: RegistrationDefaults(RegistrationStrategy = RegistrationStrategy.ImplementedInterfaces)]`.

* The `[TryRegisterXxx]` attributes are removed; but the behavior is implemented using a parameter. Example: `DuplicateStrategy = DuplicateStrategy.Skip`
