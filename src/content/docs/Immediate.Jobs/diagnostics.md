---
title: Diagnostics
description: Look up Immediate.Jobs analyzer errors, warnings and common runtime failures.
order: 18
group: Diagnostics
---

The Immediate.Jobs analyzer reports the IDs below. Immediate.Handlers separately reports invalid
handler methods, missing `partial` modifiers and other handler problems.

| ID         | Severity | Trigger and location                                                                                         | Fix                                                                                             |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `IJOB0001` | Error    | A `[Job]` type lacks `[Handler]`; job declaration.                                                           | Add Immediate.Handlers `[Handler]`.                                                             |
| `IJOB0002` | Error    | Two jobs derive/configure the same persisted name; each conflicting type.                                    | Give every job a unique stable `Name`.                                                          |
| `IJOB0003` | Error    | Two queue definitions derive/configure the same persisted name; each conflicting type.                       | Give every queue a unique stable `Name`.                                                        |
| `IJOB0004` | Error    | The compilation references NodaTime but not `Immediate.Jobs.NodaTime`; compilation-wide, no source location. | Add the companion package, or remove the NodaTime reference.                                    |
| `IJOB0005` | Error    | Invalid attempts, concurrency, enum, timeout or backoff configuration; `[Job]`.                              | Use defined enums, positive attempts/backoff/timeout and non-negative concurrency.              |
| `IJOB0006` | Error    | A cron job has a payload other than `EmptyJobRequest`; job type.                                             | Make it payloadless or remove `Cron`.                                                           |
| `IJOB0007` | Error    | Invalid five/six-field cron or unsupported cron macro, or blank cron time zone; `[Job]`.                     | Correct `Cron` and use a non-blank time-zone ID.                                                |
| `IJOB0008` | Error    | Explicit/derived job name contains no letter or digit; job type.                                             | Rename the class or set a usable `Name`.                                                        |
| `IJOB0009` | Error    | `[UsesQueue<T>]` points to a type without `[QueueDefinition]`; attribute.                                    | Mark `T` as a queue definition or select the correct type.                                      |
| `IJOB0010` | Warning  | One class carries both `[Job]` and `[QueueDefinition]`; both attributes.                                     | Split the job and queue definition into separate types.                                         |
| `IJOB0011` | Error    | Queue name is blank/reserved `default`, or concurrency is negative; queue attribute.                         | Use a non-reserved stable name and non-negative concurrency.                                    |
| `IJOB0012` | Error    | A valid job handler returns a value, such as `ValueTask<T>`, instead of `ValueTask`; handler method.         | Return non-generic `ValueTask`; background jobs have no return-value consumer.                  |
| `IJOB0013` | Error    | Payload graph cannot receive generated JSON metadata; offending request member/type.                         | Use supported concrete values, one-dimensional arrays, `List<T>` or `Dictionary<TKey, TValue>`. |
| `IJOB0014` | Error    | Context graph cannot receive generated JSON metadata; offending context member/type.                         | Apply the same AOT-safe shape rules as a job payload.                                           |
| `IJOB0015` | Warning  | `AddToBatchAsync(JobDetails, ..., ContinuationOptions.Detached)`; the `Detached` argument.                   | Use `ScheduleAfter` for detached work or a batch-joining option.                                |
| `IJOB0016` | Warning  | A `[QueueDefinition]` has no job assigned to it; queue type.                                                 | Remove the unused definition or attach a job with `[UsesQueue<T>]`.                             |

## Related runtime failures

Some problems depend on settings or stored data, so an analyzer cannot catch them:

- duplicate context extractor keys throw `ImmediateJobException` while capturing;
- negative delays and over-128-character group IDs throw argument exceptions;
- mapping the dashboard without first calling `AddImmediateJobsDashboard` throws
  `InvalidOperationException`;
- an invalid dynamic cron expression or time zone fails when the schedule is added or updated;
- Jobs logs and skips a malformed stored recurring schedule without blocking other schedules or
  queued jobs;
- graph operations on Redis or another queue-only provider throw `NotSupportedException`;
- fair acquisition on Redis throws `NotSupportedException` when `UseFairQueues` is enabled;
- conflicting storage selections or a second `ConfigureStorage` call throw `ImmediateJobException`
  during registration;
- invalid runtime, fair-queue, dashboard, or Redis options fail validation when the host starts;
- single-server mode requires `IJobStorageReplica`, `IJobGraphStorageReplica`, recurring, and graph
  support;
- single-server mode stops if it detects another scheduler process using the same durable storage;
- an unknown stored job name fails because no generated job definition can run it;
- Jobs logs and skips unknown context data so rolling deployments can continue;
- invalid dashboard route or paging values return HTTP 400 with validation details;
- dashboard mutations return HTTP 404 for an unknown job, batch or recurring schedule;
- retry/delete/cancel operations reject incompatible lifecycle states with
  `ImmediateJobException` (HTTP 409 in the dashboard).

If generation appears absent, first confirm the class is `partial`, carries both attributes, has a
valid method signature, and that the project references `Immediate.Jobs` directly. Then inspect
the `IJ.*.g.cs` files described in [How it works](/docs/Immediate.Jobs/how-it-works).
