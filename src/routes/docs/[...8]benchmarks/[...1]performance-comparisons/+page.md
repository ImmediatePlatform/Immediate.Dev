---
title: Performance comparisons
---

# {$frontmatter.title}

All performance benchmarks reported use the following environment:

```
// * Summary *

BenchmarkDotNet v0.14.0, Windows 11 (10.0.22631.4317/23H2/2023Update/SunValley3)
12th Gen Intel Core i7-12700H, 1 CPU, 20 logical and 14 physical cores
.NET SDK 9.0.100
  [Host]     : .NET 9.0.0 (9.0.24.52809), X64 RyuJIT AVX2
  DefaultJob : .NET 9.0.0 (9.0.24.52809), X64 RyuJIT AVX2
```

### [Benchmarks.Simple](https://github.com/ImmediatePlatform/Immediate.Handlers/tree/master/benchmarks/Benchmark.Simple)

This benchmark tests the various mediator implementations with a single request/response handler.

| Method                       | Mean       | Error     | Ratio | Rank | Allocated |
|----------------------------- |-----------:|----------:|------:|-----:|----------:|
| SendRequest_Baseline         |  0.6618 ns | 0.0127 ns |  1.00 |    1 |         - |
| SendRequest_IHandler         | 14.0497 ns | 0.0753 ns | 21.23 |    2 |         - |
| SendRequest_ImmediateHandler | 14.9493 ns | 0.0818 ns | 22.59 |    3 |         - |
| SendRequest_Mediator         | 22.0218 ns | 0.0684 ns | 33.28 |    4 |         - |
| SendRequest_IMediator        | 26.8625 ns | 0.1428 ns | 40.60 |    5 |         - |
| SendRequest_MediatR          | 47.5135 ns | 0.4161 ns | 71.81 |    6 |     192 B |

### [Benchmarks.Large](https://github.com/ImmediatePlatform/Immediate.Handlers/tree/master/benchmarks/Benchmark.Large)

This benchmark tests the various mediator implementations in the face of 999 request/response handlers.

| Method                       | Mean        | Error     | Ratio  | Rank | Allocated |
|----------------------------- |------------:|----------:|-------:|-----:|----------:|
| SendRequest_Baseline         |   0.6257 ns | 0.0202 ns |   1.00 |    1 |         - |
| SendRequest_ImmediateHandler |  11.2358 ns | 0.0395 ns |  17.97 |    2 |         - |
| SendRequest_IHandler         |  14.0575 ns | 0.0652 ns |  22.49 |    3 |         - |
| SendRequest_Mediator         |  22.0874 ns | 0.0534 ns |  35.33 |    4 |         - |
| SendRequest_MediatR          |  48.3577 ns | 0.2402 ns |  77.35 |    5 |     192 B |
| SendRequest_IMediator        | 420.2067 ns | 4.5092 ns | 672.17 |    6 |         - |

### [Benchmarks.Behaviors](https://github.com/ImmediatePlatform/Immediate.Handlers/tree/master/benchmarks/Benchmark.Behaviors)

This benchmark tests a more realistic scenario of using 1 behavior and 1 service.

| Method                       | Mean      | Error    | Ratio | Rank | Allocated |
|----------------------------- |----------:|---------:|------:|-----:|----------:|
| SendRequest_Baseline         |  47.83 ns | 0.160 ns |  1.00 |    1 |      40 B |
| SendRequest_ImmediateHandler |  62.67 ns | 0.350 ns |  1.31 |    2 |      40 B |
| SendRequest_IHandler         |  63.59 ns | 0.218 ns |  1.33 |    2 |      40 B |
| SendRequest_Mediator         |  91.53 ns | 0.292 ns |  1.91 |    3 |      40 B |
| SendRequest_IMediator        | 100.73 ns | 0.396 ns |  2.11 |    4 |      40 B |
| SendRequest_MediatR          | 188.54 ns | 0.785 ns |  3.94 |    5 |     560 B |
