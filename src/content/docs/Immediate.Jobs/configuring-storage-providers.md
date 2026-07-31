---
title: Configuring storage providers
description: Configure in-memory, EF Core, LinqToDB and Redis storage and own their schemas correctly.
order: 11
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

## In-memory

```csharp
builder.Services.AddMyAppJobs(options => options.UseInMemory());
```

This is also the default when no storage is selected. It is non-durable and single-node but
implements recurring, graph and fair-queue behavior for development and tests.

## Entity Framework Core

```bash
dotnet add package Immediate.Jobs.EntityFrameworkCore --prerelease
```

Prefer a dedicated, application-owned `JobsDbContext` so the jobs schema and its migrations stay
separate from your application's business model. The context can still use the same physical
database if that suits your deployment:

```csharp
// The application's business data uses its own context and model.
builder.Services.AddDbContext<AppDbContext>(db =>
	db.UseNpgsql(appConnectionString));

// Immediate.Jobs uses a separate context, model and migration set.
builder.Services.AddDbContextFactory<JobsDbContext>(db =>
	db.UseNpgsql(jobsConnectionString));       // PostgreSQL
// db.UseSqlite(jobsConnectionString);       // SQLite
// db.UseSqlServer(jobsConnectionString);    // SQL Server

builder.Services.AddMyAppJobs(options =>
	options.UseEntityFrameworkCore<JobsDbContext>());

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
	public DbSet<Order> Orders => Set<Order>();
}

public sealed class Order
{
	public Guid Id { get; set; }
}

public sealed class JobsDbContext(DbContextOptions<JobsDbContext> options) : DbContext(options)
{
	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);
		modelBuilder.AddImmediateJobs(schema: "background"); // omit the schema for SQLite
	}
}
```

Create and apply EF migrations for `JobsDbContext` in the owning application. `AddImmediateJobs`
maps six tables, their indexes and constraints; Immediate.Jobs does not apply your migrations.
`EnsureCreated` is appropriate only for samples or disposable databases. Using an existing
business `DbContext` is supported, but it couples the jobs schema and migrations to that model.

## LinqToDB

```bash
dotnet add package Immediate.Jobs.LinqToDB --prerelease
```

```csharp
var dataOptions = new DataOptions().UsePostgreSQL(connectionString);
// new DataOptions().UseSQLite(connectionString);
// new DataOptions().UseSqlServer(connectionString);

await dataOptions.CreateImmediateJobsSchemaAsync(
	schema: "background", // must be null for SQLite
	CancellationToken.None
);

builder.Services.AddMyAppJobs(options =>
	options.UseLinqToDB(dataOptions, schema: "background"));
```

The application owns `DataOptions`, the matching ADO.NET driver and production migrations. The
helper supports SQLite (without a named schema), PostgreSQL and SQL Server and creates missing
tables/indexes for a fresh database. It is not a production upgrade mechanism.

## Redis

```bash
dotnet add package Immediate.Jobs.Redis --prerelease
```

Pass a configuration string when Jobs should own the connection:

```csharp
builder.Services.AddMyAppJobs(options => options.UseRedis(
	"localhost:6379",
	redis =>
	{
		redis.Database = 1;
		redis.KeyPrefix = "billing-jobs";
	}
));
```

Or pass an application-owned `IConnectionMultiplexer`; the provider will not dispose it. The
configuration-string overload owns and disposes its connection. `Database` defaults to `-1`
(server default), and `KeyPrefix` defaults to `immediate-jobs`. Prefixes cannot contain braces
because the provider adds its own Redis Cluster hash tag for atomic Lua operations.

Redis always selects distributed mode and supports queue plus recurring capabilities. It does not
support graph workflows or fair queues.

<Callout type="warning" title="Schema ownership">

Storage initialization is idempotent provider startup, not a substitute for controlled production
schema evolution. Keep migrations/bootstrap and provider packages at the same preview revision as
the core package. The batch table now includes a non-null `SkippedCount` column; existing SQL
schemas created before that field need an application-owned migration that defaults it to zero.

</Callout>
