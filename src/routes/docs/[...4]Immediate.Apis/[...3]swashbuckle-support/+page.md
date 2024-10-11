---
title: Swashbuckle support
---

# {$frontmatter.title}

In order for Swagger to be able to work, the generated JSON schema is required to have unique `schemaId`'s. To achieve this, Swashbuckle uses class names as simple `schemaId`'s. When using `Immediate.Handlers` classes with a controller action inside, you might end up with Swashbuckle stating an error similar to this:

```
Swashbuckle.AspNetCore.SwaggerGen.SwaggerGeneratorException: Failed to generate schema for type - MyApp.Api.DeleteUser+Command. See inner exception
System.InvalidOperationException: Can't use schemaId "$Command" for type "$MyApp.Api.DeleteUser+Command". The same schemaId is already used for type "$MyApp.Api.CreateUserCommand+Command"
```

This error indicates Swashbuckle is trying to use two classes named `Command` from two (or more) different Handlers in different namespaces.

To fix this, the following options must be defined in your SwaggerGen configuration:

```cs |copy|title=Program.cs
builder.Services.AddSwaggerGen(options =>
{
    options.CustomSchemaIds(x => x.FullName?.Replace("+", ".", StringComparison.Ordinal));
});
```
