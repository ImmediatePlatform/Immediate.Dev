---
title: DuplicateStrategy
description: Assembly defaults and how duplicate registration strategies behave.
---

# {$frontmatter.title}

Use `RegistrationDefaults` to set assembly-wide defaults for registration behavior:

```cs |copy|title=AssemblyInfo.cs
using Immediate.Injections.Shared;

[assembly: RegistrationDefaults(DuplicateStrategy = DuplicateStrategy.Replace)]
```

`DuplicateStrategy` semantics:
- `Append`: add a new registration (generated code will call `services.Add(...)`).
- `Skip`: skip if a registration exists (generated code will call `TryAdd`).
- `Replace`: replace the first existing registration (generated code will call `Replace`).