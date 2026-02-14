---
title: Integrating with Immediate.Handlers
description: Learn how to integrate with Immediate.Handlers
---

# {$frontmatter.title}

Adding code to explicitly validate the object in every method that needs to do so can be annoying. Immediate.Validations
is intended to integrate primarily with Immediate.Handlers, and so it provides an IH `Behavior<,>` which can be used to
automatically add validation to every IH handler which has a request which is an `IValidation<>` object. Add
Immediate.Validations to the Immediate.Handlers behaviors pipeline by including it in the list of default Behaviors for
the assembly:

```cs |copy|title=AssemblyAttributes.cs {1}
using Immediate.Validations.Shared;

[assembly: Behaviors(
	typeof(ValidationBehavior<,>)
)]
```
