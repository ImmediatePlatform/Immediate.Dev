---
title: Performance comparisons
---

# {$frontmatter.title}

All performance benchmarks reported use the following environment:

```
// * Summary *

BenchmarkDotNet v0.16.0-nightly.20260608.560, Windows 11 (10.0.26200.8655/25H2/2025Update/HudsonValley2)
12th Gen Intel Core i7-12700H 2.30GHz, 1 CPU, 20 logical and 14 physical cores
Memory: 31.69 GB Total, 21.22 GB Available
.NET SDK 11.0.100-preview.5.26302.115
  [Host]     : .NET 11.0.0 (11.0.0-preview.5.26302.115, 11.0.26.30315), X64 RyuJIT x86-64-v3
  Job-GVKUBM : .NET 10.0.9 (10.0.9, 10.0.926.27113), X64 RyuJIT x86-64-v3
  Job-IHFIKV : .NET 11.0.0 (11.0.0-preview.5.26302.115, 11.0.26.30315), X64 RyuJIT x86-64-v3
  Job-AZESIF : .NET 8.0.28 (8.0.28, 8.0.2826.26413), X64 RyuJIT x86-64-v3
```

### InvokeAsync (aka Command)

This benchmark tests the various mediator implementations with a single command (no/`Unit` return value).

| Implementation     | Scenario           | Runtime   | Mean           | Error       | Gen0   | Gen1   | Allocated |
|------------------- |------------------- |---------- |---------------:|------------:|-------:|-------:|----------:|
| Direct             | InvokeAsync        | .NET 11.0 |      0.9767 ns |   0.0065 ns |      - |      - |         - |
| Immediate.Handlers | InvokeAsync        | .NET 11.0 |      2.3605 ns |   0.0022 ns |      - |      - |         - |
| MediatorNet        | InvokeAsync        | .NET 11.0 |     12.5804 ns |   0.0454 ns |      - |      - |         - |
| Foundatio.Mediator | InvokeAsync        | .NET 11.0 |     14.0770 ns |   0.0608 ns | 0.0019 |      - |      24 B |
| DispatchR          | InvokeAsync        | .NET 11.0 |     20.6877 ns |   0.0292 ns |      - |      - |         - |
| Axent              | InvokeAsync        | .NET 11.0 |     44.2312 ns |   0.1712 ns | 0.0063 |      - |      80 B |
| MediatR            | InvokeAsync        | .NET 11.0 |     49.6130 ns |   0.2401 ns | 0.0102 |      - |     128 B |

### InvokeAsyncT (aka Query)

This benchmark tests the various mediator implementations with a simple query with value response.

| Implementation     | Scenario           | Runtime   | Mean           | Error       | Gen0   | Gen1   | Allocated |
|------------------- |------------------- |---------- |---------------:|------------:|-------:|-------:|----------:|
| Direct             | InvokeAsyncT       | .NET 11.0 |     22.8746 ns |   0.0713 ns | 0.0038 |      - |      48 B |
| Immediate.Handlers | InvokeAsyncT       | .NET 11.0 |     24.1921 ns |   0.0680 ns | 0.0038 |      - |      48 B |
| MediatorNet        | InvokeAsyncT       | .NET 11.0 |     37.3381 ns |   0.0689 ns | 0.0038 |      - |      48 B |
| Foundatio.Mediator | InvokeAsyncT       | .NET 11.0 |     40.9700 ns |   0.0764 ns | 0.0057 |      - |      72 B |
| DispatchR          | InvokeAsyncT       | .NET 11.0 |     47.7985 ns |   0.1209 ns | 0.0038 |      - |      48 B |
| Axent              | InvokeAsyncT       | .NET 11.0 |     63.1785 ns |   0.1873 ns | 0.0082 |      - |     104 B |
| MediatR            | InvokeAsyncT       | .NET 11.0 |     74.2955 ns |   0.9705 ns | 0.0197 |      - |     248 B |

### InvokeAsyncTWithDI (aka FullQuery)

This benchmark tests the various mediator implementations with a query that includes a DI parameter and a behavior.

| Implementation     | Scenario           | Runtime   | Mean           | Error       | Gen0   | Gen1   | Allocated |
|------------------- |------------------- |---------- |---------------:|------------:|-------:|-------:|----------:|
| Direct             | InvokeAsyncTWithDI | .NET 11.0 |     32.8809 ns |   0.0889 ns | 0.0032 |      - |      40 B |
| Immediate.Handlers | InvokeAsyncTWithDI | .NET 11.0 |     48.4441 ns |   0.1384 ns | 0.0032 |      - |      40 B |
| Foundatio.Mediator | InvokeAsyncTWithDI | .NET 11.0 |     59.6983 ns |   0.1802 ns | 0.0051 |      - |      64 B |
| MediatorNet        | InvokeAsyncTWithDI | .NET 11.0 |     61.1463 ns |   0.1275 ns | 0.0031 |      - |      40 B |
| DispatchR          | InvokeAsyncTWithDI | .NET 11.0 |     73.2588 ns |   0.2354 ns | 0.0031 |      - |      40 B |
| Axent              | InvokeAsyncTWithDI | .NET 11.0 |     84.3546 ns |   0.3107 ns | 0.0076 |      - |      96 B |
| MediatR            | InvokeAsyncTWithDI | .NET 11.0 |    143.0193 ns |   0.8873 ns | 0.0439 |      - |     552 B |

## Code and Full Results

* The code can be found at: [https://github.com/ImmediatePlatform/MediatorBenchmarks](https://github.com/ImmediatePlatform/MediatorBenchmarks)
* The full results of the latest benchmark can be found at: [https://github.com/ImmediatePlatform/MediatorBenchmarks/blob/main/Results/Benchmark-2026-06-11-report.csv](https://github.com/ImmediatePlatform/MediatorBenchmarks/blob/main/Results/Benchmark-2026-06-11-report.csv)
