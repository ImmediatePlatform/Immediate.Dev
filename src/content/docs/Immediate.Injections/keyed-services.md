---
title: Keyed services
description: Register several implementations of one interface under distinct keys and resolve them with GetRequiredKeyedService.
order: 4
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

Set `ServiceKey` on any registration attribute and the generated code emits a keyed
`ServiceDescriptor` instead of a plain one. The service is then resolvable only through the
keyed APIs.

## A keyed registration

```csharp title="NotificationSenders.cs"
using Immediate.Injections.Shared;

public interface INotificationSender
{
	Task SendAsync(string message, CancellationToken token);
}

[RegisterScoped<INotificationSender>(ServiceKey = "email")]
public sealed class EmailNotificationSender : INotificationSender
{
	public Task SendAsync(string message, CancellationToken token) => Task.CompletedTask;
}

[RegisterScoped<INotificationSender>(ServiceKey = "sms")]
public sealed class SmsNotificationSender : INotificationSender
{
	public Task SendAsync(string message, CancellationToken token) => Task.CompletedTask;
}
```

```csharp title="Generated output"
ServiceDescriptor.KeyedScoped(typeof(INotificationSender), "email", typeof(EmailNotificationSender));
ServiceDescriptor.KeyedScoped(typeof(INotificationSender), "sms", typeof(SmsNotificationSender));
```

## Resolving

```csharp title="NotificationService.cs"
using Microsoft.Extensions.DependencyInjection;

public sealed class NotificationService(IServiceProvider provider)
{
	public Task NotifyAsync(string channel, string message, CancellationToken token)
	{
		var sender = provider.GetRequiredKeyedService<INotificationSender>(channel);
		return sender.SendAsync(message, token);
	}
}
```

Constructor injection works too, via `[FromKeyedServices]`:

```csharp title="EmailOnlyService.cs"
using Microsoft.Extensions.DependencyInjection;

public sealed class EmailOnlyService(
	[FromKeyedServices("email")] INotificationSender sender
);
```

<Callout type="warning" title="A keyed registration is not also unkeyed">
<code>GetService&lt;INotificationSender&gt;()</code> returns <code>null</code> for a keyed
registration, and <code>GetKeyedService&lt;INotificationSender&gt;("other")</code> returns
<code>null</code> for a key that was never registered.
</Callout>

If a service should be reachable both ways, apply the attribute twice — the lifetime attributes
are `AllowMultiple = true`:

```csharp title="BothWays.cs"
[RegisterScoped<INotificationSender>]
[RegisterScoped<INotificationSender>(ServiceKey = "email")]
public sealed class EmailNotificationSender : INotificationSender;
```

That produces two independent descriptors, so under a non-singleton lifetime you get two
instances. To share one, register it once for real and let the other resolve through it — see
[Factories and proxies](/docs/Immediate.Injections/factories-and-proxies).

## What can be a key

`ServiceKey` is typed `object?`, so any expression that C# accepts as an attribute argument
works — the value is emitted verbatim into the generated `ServiceDescriptor` call.

```csharp title="KeyKinds.cs"
using Immediate.Injections.Shared;

public enum Channel { Email, Sms }

[RegisterScoped<INotificationSender>(ServiceKey = "email")]           // string literal
public sealed class A : INotificationSender;

[RegisterScoped<INotificationSender>(ServiceKey = B.Key)]             // const field
public sealed class B : INotificationSender
{
	public const string Key = "email-const";
}

[RegisterScoped<INotificationSender>(ServiceKey = Channel.Sms)]       // enum member
public sealed class C : INotificationSender;

[RegisterScoped<INotificationSender>(ServiceKey = 1)]                 // integer
public sealed class D : INotificationSender;
```

Whatever you use, resolve with the _same value_ — MSDI compares keys with `Equals`, so
`Channel.Email` and `"Email"` are different keys.

Two limits follow from this being an attribute argument:

- The value must be a compile-time constant. `KeyedService.AnyKey` is a property, so it cannot
  be written here; use it at the resolution site instead.
- Writing `ServiceKey = null` explicitly is treated as _no key_ — the generator emits a plain,
  unkeyed registration.

## Keyed factories

If the registration also names a `Factory`, the factory signature changes: a keyed factory takes
a second `object` parameter.

```csharp title="KeyedFactoryService.cs"
using Immediate.Injections.Shared;
using Microsoft.Extensions.DependencyInjection;

public interface IKeyedFactoryService
{
	object? ServiceKey { get; }
}

[RegisterSingleton<IKeyedFactoryService>(ServiceKey = Key, Factory = nameof(Create))]
public sealed class KeyedFactoryService(object? serviceKey) : IKeyedFactoryService
{
	public const string Key = "factory-key";

	public object? ServiceKey { get; } = serviceKey;

	public static KeyedFactoryService Create(IServiceProvider provider, object? serviceKey) =>
		new(serviceKey);
}
```

<Callout type="note" title="The key parameter is the requested key, not the declared one">
That second parameter is MSDI's <code>KeyedImplementationFactory</code> argument. It carries the
key the caller asked for at resolution time, which is not necessarily the
<code>ServiceKey</code> written on the attribute — most visibly when the service was registered
against <code>KeyedService.AnyKey</code> elsewhere. Treat it as input, not as a constant.
</Callout>

A factory whose signature does not match the keyed/unkeyed shape is
[INJ0010](/docs/Immediate.Injections/diagnostics#inj0010).

## Where to go next

- [Factories and proxies](/docs/Immediate.Injections/factories-and-proxies)
- [Registration strategies](/docs/Immediate.Injections/registration-strategies)
- [Attributes reference](/docs/Immediate.Injections/attributes-reference)
