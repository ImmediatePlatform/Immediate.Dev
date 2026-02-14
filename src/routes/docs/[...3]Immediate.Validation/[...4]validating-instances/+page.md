---
title: Validating Instances
description: Learn how to validate an instance
---

# {$frontmatter.title}

An instance of an IV object can be validated directly by calling `ClassName.Validate(instance);`. In the example above,
this would look like:

```cs
public void Method(Query query)
{
	var results = Query.Validate(query);
}
```

The `results` object will contain information on whether the instance is valid, and if not, the validation failures that
occurred during validation.

If you would like to throw an exception if the validation fails, you can call `ValidationException.ThrowIfInvalid()`. This
method can be called using the `ValidationResult` returned from validation if you have already validated it, or using an
instance of the object if you would like to validate and throw. Examples:

```cs
public void Method(Query query)
{
	var results = Query.Validate(query);
	ValidationException.ThrowIfInvalid(results);

	// or

	ValidationException.ThrowIfInvalid(query);
}
```