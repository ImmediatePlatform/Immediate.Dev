---
title: Diagnostics
description: Current Immediate.Jobs analyzer errors and warnings, their locations and remediations.
order: 18
group: Diagnostics
---

Immediate.Jobs ships both declaration analyzers and the newer generator-shape analyzer. Their IDs
are literal strings, so `IJOB0004` and `IJOB004` are different diagnostics. All entries below are
active in the checked-out analyzer source and tests.

| ID         | Severity | Trigger and location                                                                                                           | Fix                                                                                    |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `IJOB0001` | Error    | A `[Job]` type lacks `[Handler]`; job declaration.                                                                             | Add Immediate.Handlers `[Handler]`.                                                    |
| `IJOB0002` | Error    | Two jobs derive/configure the same persisted name; each conflicting type.                                                      | Give every job a unique stable `Name`.                                                 |
| `IJOB0003` | Error    | Two queue definitions derive/configure the same persisted name; each conflicting type.                                         | Give every queue a unique stable `Name`.                                               |
| `IJOB0004` | Error    | The compilation references NodaTime but not `Immediate.Jobs.NodaTime`; compilation-wide, no source location.                   | Add the companion package, or remove the NodaTime reference.                           |
| `IJOB0005` | Error    | `MaxAttempts < 1`, negative `MaxConcurrency`, undefined enum, or invalid/non-positive `Timeout`/`BackoffBase`; `[Job]`.        | Use a valid positive/defined value.                                                    |
| `IJOB0006` | Error    | A cron job has a payload other than `EmptyJobRequest`; job type.                                                               | Make it payloadless or remove `Cron`.                                                  |
| `IJOB0007` | Error    | Invalid five/six-field cron or blank cron time zone; `[Job]`.                                                                  | Correct `Cron` and use a non-blank IANA zone.                                          |
| `IJOB0008` | Error    | Explicit/derived job name contains no letter or digit; job type.                                                               | Rename the class or set a usable `Name`.                                               |
| `IJOB0009` | Error    | `[UsesQueue<T>]` points to a type without `[QueueDefinition]`; attribute.                                                      | Mark `T` as a queue definition or select the correct type.                             |
| `IJOB0020` | Warning  | `AddToBatchAsync(JobDetails, ..., ContinuationOptions.Detached)`; the `Detached` argument.                                     | Use `ScheduleAfter` for detached work or a batch-joining option.                       |
| `IJOB003`  | Error    | Payload graph cannot receive source-generated JSON metadata; request parameter.                                                | Replace delegates, pointers, ref-like/open/inaccessible shapes with serializable data. |
| `IJOB004`  | Error    | The job does not have exactly one private instance `HandleAsync` returning `ValueTask`, request first and token last; `[Job]`. | Match the required Immediate.Handlers job signature.                                   |
| `IJOB010`  | Error    | Queue name is blank/reserved `default`, or concurrency is negative; queue attribute.                                           | Use a non-reserved stable name and non-negative concurrency.                           |
| `IJOB011`  | Error    | Queue target lacks `[QueueDefinition]`; `[UsesQueue<T>]`.                                                                      | Define the queue. This overlaps the older `IJOB0009` check.                            |
| `IJOB013`  | Error    | Context extractor does not implement exactly one `IJobContextExtractor<T>`; context-use attribute.                             | Implement one closed extractor interface.                                              |
| `IJOB014`  | Error    | Context value graph cannot receive source-generated JSON metadata; context-use attribute.                                      | Use an AOT-safe serializable context record.                                           |

## Related runtime failures

Some facts depend on runtime values or durable state and cannot be diagnosed at compile time:

- duplicate context extractor keys throw `ImmediateJobException` while capturing;
- negative delays, over-128-character group IDs and invalid dashboard intervals throw argument
  exceptions;
- invalid dynamic cron/time zones fail when adding/updating the schedule;
- graph operations on Redis or another queue-only provider throw `NotSupportedException`;
- fair acquisition on Redis throws `NotSupportedException` when `UseFairQueues` is enabled;
- single-server mode rejects providers without replica, recurring and graph capabilities and
  detects multiple-process replica drift;
- unknown stored job names fail terminally because no generated definition can execute them;
- unknown context slices are logged and skipped so rolling deployments can continue;
- retry/delete/cancel operations reject incompatible lifecycle states with
  `ImmediateJobException` (HTTP 409 in the dashboard).

If generation appears absent, first confirm the class is `partial`, carries both attributes, has a
valid method signature, and that the project references `Immediate.Jobs` directly. Then inspect
the `IJ.*.g.cs` files described in [How it works](/docs/Immediate.Jobs/how-it-works).
