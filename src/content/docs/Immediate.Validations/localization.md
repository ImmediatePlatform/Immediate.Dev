---
title: Localization
description: Built-in English and French messages, and how to supply your own IStringLocalizer.
order: 7
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Every built-in validator reads its `DefaultMessage` from
`ValidationConfiguration.Localizer`, an `IStringLocalizer` keyed by validator attribute type name.
Out of the box the package ships English and French message catalogues and selects between them
using `CultureInfo.CurrentUICulture`.

## Built-in cultures

Selection uses the current UI culture's two-letter ISO language name, so `en-US`, `en-GB` and
`en-AU` all resolve to `en`, and `fr-FR` and `fr-CA` to `fr`. **Any other culture falls back to
English** — there is no per-region variation and no exception for an unknown culture.

```csharp
CultureInfo.CurrentUICulture = new CultureInfo("fr-CA");

var errors = Query.Validate(new Query { Id = 0 });
// "'Id' doit être supérieur à '0'."
```

## Message keys and defaults

The key for each message is the validator's attribute type name, including the `Attribute`
suffix — `GreaterThanAttribute`, not `GreaterThan`.

| Key                           | English                                                                              | French                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `EmptyAttribute`              | `'{PropertyName}' must be empty.`                                                    | `'{PropertyName}' doit être vide.`                                                          |
| `EnumValueAttribute`          | `'{PropertyName}' has a range of values which does not include '{PropertyValue}'.`   | `'{PropertyName}' a une plage de valeurs qui n'inclut pas '{PropertyValue}'.`               |
| `EqualAttribute`              | `'{PropertyName}' must be equal to '{ComparisonValue}'.`                             | `'{PropertyName}' doit être égal à '{ComparisonValue}'.`                                    |
| `GreaterThanAttribute`        | `'{PropertyName}' must be greater than '{ComparisonValue}'.`                         | `'{PropertyName}' doit être supérieur à '{ComparisonValue}'.`                               |
| `GreaterThanOrEqualAttribute` | `'{PropertyName}' must be greater than or equal to '{ComparisonValue}'.`             | `'{PropertyName}' doit être supérieur ou égal à '{ComparisonValue}'.`                       |
| `LengthAttribute`             | `'{PropertyName}' must be between {MinLengthValue} and {MaxLengthValue} characters.` | `'{PropertyName}' doit être compris entre {MinLengthValue} et {MaxLengthValue} caractères.` |
| `LessThanAttribute`           | `'{PropertyName}' must be less than '{ComparisonValue}'.`                            | `'{PropertyName}' doit être inférieur à '{ComparisonValue}'.`                               |
| `LessThanOrEqualAttribute`    | `'{PropertyName}' must be less than or equal to '{ComparisonValue}'.`                | `'{PropertyName}' doit être inférieur ou égal à '{ComparisonValue}'.`                       |
| `MatchAttribute`              | `'{PropertyName}' is not in the correct format.`                                     | `'{PropertyName}' n'est pas au bon format.`                                                 |
| `MaxLengthAttribute`          | `'{PropertyName}' must be less than {MaxLengthValue} characters.`                    | `'{PropertyName}' doit être inférieur à {MaxLengthValue} caractères.`                       |
| `MinLengthAttribute`          | `'{PropertyName}' must be more than {MinLengthValue} characters.`                    | `'{PropertyName}' doit être supérieur à {MinLengthValue} caractères.`                       |
| `NotEmptyAttribute`           | `'{PropertyName}' must not be empty.`                                                | `'{PropertyName}' ne doit pas être vide.`                                                   |
| `NotEqualAttribute`           | `'{PropertyName}' must not be equal to '{ComparisonValue}'.`                         | `'{PropertyName}' ne doit pas être égal à '{ComparisonValue}'.`                             |
| `NotNullAttribute`            | `'{PropertyName}' must not be null.`                                                 | `'{PropertyName}' ne doit pas être nul.`                                                    |
| `OneOfAttribute`              | `'{PropertyName}' was not one of the specified values: {ValuesValue}.`               | `'{PropertyName}' n'était pas l'une des valeurs spécifiées : {ValuesValue}.`                |

## Supplying your own localizer

`ValidationConfiguration.Localizer` is a static, settable `IStringLocalizer`. Assign any
implementation to replace the catalogue wholesale — this is also how you change the default
English wording without touching every attribute.

```csharp title="Program.cs"
using Immediate.Validations.Shared;

ValidationConfiguration.Localizer = myLocalizer;
```

A worked example backed by `.resx` files. Add `Validators.resx` and `Validators.fr-CA.resx` to
your project, with one entry per validator type name:

```xml title="Resources/Validators.resx"
<data name="GreaterThanAttribute" xml:space="preserve">
  <value>'{PropertyName}' has to be more than '{ComparisonValue}'.</value>
</data>
<data name="NotNullAttribute" xml:space="preserve">
  <value>'{PropertyName}' is required.</value>
</data>
```

Then wire a `ResourceManagerStringLocalizer` at startup:

```csharp title="Program.cs"
using Immediate.Validations.Shared;
using Microsoft.Extensions.Localization;

var resourceManager = Resources.Validators.ResourceManager;

ValidationConfiguration.Localizer = new ResourceManagerStringLocalizer(
	resourceManager,
	typeof(Program).Assembly,
	resourceManager.BaseName,
	new ResourceNamesCache(),
	NullLogger<Program>.Instance
);
```

`ResourceManagerStringLocalizer` resolves against `CultureInfo.CurrentUICulture` itself, so
per-request culture selection (for example ASP.NET Core's `RequestLocalizationMiddleware`) works
without further wiring.

<Callout type="warning">

`ValidationConfiguration.Localizer` is a **static** property, not a DI service. Set it once
during startup. It is not scoped, so it cannot vary per request — only the _culture_ varies per
request.

</Callout>

<Callout type="note">

A key your localizer does not contain resolves to the key itself, so a missing
`GreaterThanAttribute` entry produces the error message `GreaterThanAttribute`. Supply all
fifteen keys, or fall back to the built-in localizer for the ones you do not override.

</Callout>

## What is not localized

- Messages set explicitly via a validator's `Message` property. Those are compiled into the
  generated code as literals.
- The root-null sentinel. When `Validate` is handed a `null` reference-typed target it returns a
  single error, `` `target` must not be `null`. ``, which is a hard-coded literal in the
  generated code and never passes through the localizer. See
  [property path rules](/docs/Immediate.Validations/nested-and-collection-validation#property-path-rules).
- Display names. `{PropertyName}` renders the humanized C# identifier, or `[Description]` if you
  supply one — neither is culture-aware.

## Custom validators

Your own validators opt into localization by reading the same configuration point:

```csharp
public static string DefaultMessage =>
	ValidationConfiguration.Localizer[nameof(DivisibleByAttribute)].Value;
```

Because `DefaultMessage` is a property, it is re-read on each failure, so a culture change
between validations is picked up. A `const string DefaultMessage` is baked in and cannot be
localized.
