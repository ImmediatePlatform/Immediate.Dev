---
title: Performance comparisons
---

# {$frontmatter.title}

All performance benchmarks reported use the following environment:

```
// * Summary *

BenchmarkDotNet v0.13.12, Windows 11 (10.0.22621.3007/22H2/2022Update/SunValley2)
12th Gen Intel Core i7-12700H, 1 CPU, 20 logical and 14 physical cores
.NET SDK 8.0.101
  [Host]     : .NET 8.0.1 (8.0.123.58001), X64 RyuJIT AVX2
  DefaultJob : .NET 8.0.1 (8.0.123.58001), X64 RyuJIT AVX2
```

### [Benchmarks.Simple](https://github.com/ImmediatePlatform/Immediate.Handlers/tree/master/benchmarks/Benchmark.Simple)

This benchmark tests the various mediator implementations with a single request/response handler.

| Method                       |       Mean |     Error | Ratio | Rank | Allocated |
| ---------------------------- | ---------: | --------: | ----: | ---: | --------: |
| SendRequest_Baseline         |  0.7701 ns | 0.0180 ns |  1.00 |    1 |         - |
| SendRequest_IHandler         | 15.6780 ns | 0.0476 ns | 20.36 |    2 |         - |
| SendRequest_ImmediateHandler | 16.6023 ns | 0.0561 ns | 21.56 |    3 |         - |
| SendRequest_Mediator         | 27.2993 ns | 0.4269 ns | 35.49 |    4 |         - |
| SendRequest_IMediator        | 31.3420 ns | 0.1006 ns | 40.64 |    5 |         - |
| SendRequest_MediatR          | 68.3384 ns | 0.3453 ns | 88.73 |    6 |     240 B |

### [Benchmarks.Large](https://github.com/ImmediatePlatform/Immediate.Handlers/tree/master/benchmarks/Benchmark.Large)

This benchmark tests the various mediator implementations in the face of 999 request/response handlers.

| Method                       |        Mean |     Error |  Ratio | Rank | Allocated |
| ---------------------------- | ----------: | --------: | -----: | ---: | --------: |
| SendRequest_Baseline         |   0.5656 ns | 0.0252 ns |   1.00 |    1 |         - |
| SendRequest_ImmediateHandler |  15.4346 ns | 0.0516 ns |  27.34 |    2 |         - |
| SendRequest_IHandler         |  16.0959 ns | 0.0552 ns |  28.50 |    3 |         - |
| SendRequest_Mediator         |  27.4104 ns | 0.0449 ns |  48.54 |    4 |         - |
| SendRequest_MediatR          |  80.0953 ns | 0.4749 ns | 141.83 |    5 |     240 B |
| SendRequest_IMediator        | 435.3890 ns | 1.6399 ns | 771.01 |    6 |         - |

### [Benchmarks.Behaviors](https://github.com/ImmediatePlatform/Immediate.Handlers/tree/master/benchmarks/Benchmark.Behaviors)

This benchmark tests a more realistic scenario of using 1 behavior and 1 service.

| Method                       |      Mean |    Error | Ratio | Rank | Allocated |
| ---------------------------- | --------: | -------: | ----: | ---: | --------: |
| SendRequest_Baseline         |  56.71 ns | 0.174 ns |  1.00 |    1 |      40 B |
| SendRequest_IHandler         |  78.90 ns | 0.304 ns |  1.39 |    2 |      40 B |
| SendRequest_ImmediateHandler |  80.02 ns | 0.288 ns |  1.41 |    3 |      40 B |
| SendRequest_Mediator         | 101.23 ns | 0.263 ns |  1.78 |    4 |      40 B |
| SendRequest_IMediator        | 104.92 ns | 0.297 ns |  1.85 |    5 |      40 B |
| SendRequest_MediatR          | 201.27 ns | 1.023 ns |  3.55 |    6 |     560 B |
