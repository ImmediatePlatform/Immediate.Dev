---
title: Package compatibility
description: Which packages require which, the supported target frameworks, and the documentation's versioning policy.
order: 5
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

## At a glance

| Package                                                           | Requires                           | Target frameworks | Current major |
| ----------------------------------------------------------------- | ---------------------------------- | ----------------- | ------------- |
| [Immediate.Handlers](/docs/Immediate.Handlers/introduction)       | —                                  | net8.0 – net11.0  | 3.x           |
| [Immediate.Validations](/docs/Immediate.Validations/introduction) | Immediate.Handlers                 | net8.0 – net11.0  | 3.x           |
| [Immediate.Apis](/docs/Immediate.Apis/introduction)               | Immediate.Handlers, ASP.NET Core   | net8.0 – net11.0  | 6.x           |
| [Immediate.Cache](/docs/Immediate.Cache/introduction)             | Immediate.Handlers, `IMemoryCache` | net8.0 – net11.0  | 2.x           |
| [Immediate.Injections](/docs/Immediate.Injections/introduction)   | — (see below)                      | net8.0 – net11.0  | 0.x           |

Immediate.Handlers is the core. Validations, Apis and Cache each take a package reference on it
and are meaningless without it — they extend handlers rather than standing alone. You do not
need to install it separately; it comes in transitively.

<Callout type="warning" title="Immediate.Injections is the exception, with an asterisk">
Immediate.Injections has no dependency on Immediate.Handlers and works on its own. The one
seam is <code>[assembly: ImmediateAssemblyIdentifier]</code>, whose attribute type is defined in
the Immediate.Handlers package. Using it in an Injections-only project requires either a
reference to Immediate.Handlers or a hand-declared matching type — see
<a href="/docs/concepts/assembly-identifier">The assembly identifier</a>.
</Callout>

## Mixing and matching

The packages are opt-in individually. Common combinations:

- **Handlers alone** — a compile-time mediator in a console app, a Blazor app, or behind
  ASP.NET Core controllers you already have.
- **Handlers + Apis** — minimal-API endpoints generated straight from handlers.
- **Handlers + Validations** — request validation as a pipeline behavior, with or without HTTP.
- **Injections alone** — attribute-driven DI registration, with no mediator anywhere in sight.

You can also mix in non-platform libraries: FluentValidation alongside Immediate.Handlers, or
ASP.NET Core controllers instead of Immediate.Apis. The
[cookbook](/docs/cookbook/the-cookbook) has worked examples of each.

## Target frameworks

All five packages multi-target **net8.0, net9.0, net10.0 and net11.0**.

Generators and analyzers ship in two Roslyn flavours — 4.8 for net8.0/net9.0 and 5.0 for
net10.0/net11.0 — selected automatically by NuGet. See
[How source generation works](/docs/concepts/source-generation).

## C# language version

The packages target `LangVersion` `latest` and work on C# 12 and later, but one generated
signature adapts: the `tags` parameter on the registration methods is
`params ReadOnlySpan<string>` on **C# 13 and later** and `params string[]` on C# 12 and earlier.
See [Tags and conditional registration](/docs/concepts/tags).

## Versioning policy for these docs

<Callout type="note">
This site documents the <strong>latest release</strong> of each package only. There are no
versioned doc trees. Where behavior changed in a specific release — a diagnostic that was
removed, an attribute constructor that was obsoleted — it is called out inline with a callout on
the relevant page, and removed diagnostic IDs are kept in the diagnostics tables so that
searching for one still lands somewhere useful.
</Callout>

The five packages version independently. A major bump in one does not imply a bump in the
others, and there is no combined "platform version" to pin.
