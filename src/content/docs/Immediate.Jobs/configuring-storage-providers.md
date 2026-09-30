---
title: Configuring storage providers
description: Configure built-in storage providers and manage their database schemas.
order: 11
group: Guides
---

<script lang="ts">
	import { Callout } from '$lib/components/docs';
</script>

## In-memory

```csharp
builder.Services.AddMyAppJobs()
	.ConfigureStorage(storage => storage.UseInMemory());
```

Select in-memory storage explicitly. It keeps data in one process and loses it on restart, but it
supports every job feature. Use it for development and tests.

## Entity Framework Core

```bash
dotnet add package Immediate.Jobs.EntityFrameworkCore --prerelease
```

Prefer a dedicated, application-owned `JobsDbContext` so the jobs schema stays separate from your
application's business model. The context can still use the same physical database if that suits
your deployment:

```csharp
// The application's business data uses its own context and model.
builder.Services.AddDbContext<AppDbContext>(db =>
	db.UseNpgsql(appConnectionString));

// Immediate.Jobs uses a separate context and model.
builder.Services.AddDbContextFactory<JobsDbContext>(db =>
	db.UseNpgsql(jobsConnectionString));       // PostgreSQL
// db.UseSqlite(jobsConnectionString);       // SQLite
// db.UseSqlServer(jobsConnectionString);    // SQL Server

builder.Services.AddMyAppJobs()
	.ConfigureStorage(storage => storage
		.UseEntityFrameworkCore<JobsDbContext>()
		.UseSingleServer());

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

`AddImmediateJobs` configures the EF Core model but does not ship or apply migration files. Generate
an application-owned migration explicitly after adding the model:

```bash
dotnet ef migrations add CreateImmediateJobsSchema \
	--context JobsDbContext \
	--output-dir Migrations/ImmediateJobs
```

Run the command from the startup project. If the context and startup application are in different
projects, also pass the appropriate `--project` and `--startup-project` paths. Apply the generated
migration through the application's normal deployment process, or locally with:

```bash
dotnet ef database update --context JobsDbContext
```

The generated migration creates the seven Immediate.Jobs tables, indexes and constraints.
`EnsureCreated` is appropriate only for samples or disposable databases. Using an existing business
`DbContext` is supported, but it couples the jobs schema to that model.

## LinqToDB

```bash
dotnet add package Immediate.Jobs.LinqToDB --prerelease
```

```csharp
using LinqToDB;
using LinqToDB.Data;
using LinqToDB.Extensions.DependencyInjection;

var dataOptions = new DataOptions().UsePostgreSQL(connectionString);
// new DataOptions().UseSQLite(connectionString);
// new DataOptions().UseSqlServer(connectionString);

builder.Services.AddLinqToDBContext<JobsDataConnection>(() => dataOptions);

await using (var connection = new JobsDataConnection(dataOptions))
{
	await connection.CreateImmediateJobsSchemaAsync(
		schema: "background", // must be null for SQLite
		CancellationToken.None
	);
}

builder.Services.AddMyAppJobs()
	.ConfigureStorage(storage => storage
		.UseLinqToDB<JobsDataConnection>(schema: "background")
		.UseSingleServer());

public sealed class JobsDataConnection(DataOptions options) : DataConnection(options);
```

Register the `DataConnection` type with dependency injection. Jobs resolves it when storage work
starts. The application owns `DataOptions`, the matching ADO.NET driver and the database schema.
The helper supports SQLite (without a named schema), PostgreSQL and SQL Server. It creates the
tables and indexes for a new database. Timestamps are stored in native date-and-time columns
rather than integer ticks.

## Redis

```bash
dotnet add package Immediate.Jobs.Redis --prerelease
```

Register an `IConnectionMultiplexer`, then select Redis storage:

```csharp
using StackExchange.Redis;

builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
	ConnectionMultiplexer.Connect("localhost:6379"));

builder.Services.AddMyAppJobs()
	.ConfigureStorage(storage => storage
		.UseRedis()
		.ConfigureRedis(redis =>
		{
			redis.Database = 1;
			redis.KeyPrefix = "billing-jobs";
		}));
```

The provider uses the registered connection and does not dispose it. The dependency injection
container disposes the connection in this example because it creates the singleton. If you
register an existing instance, its owner must dispose it. `Database` defaults to `-1` (server
default), and `KeyPrefix` defaults to `immediate-jobs`. The prefix cannot contain `{` or `}` because
Jobs uses those characters internally. Jobs validates these options at startup.

`ConfigureRedis` also accepts an `OptionsBuilder<RedisJobStorageOptions>` action. Use it to bind an
`IConfiguration` section:

```csharp
builder.Services.AddMyAppJobs()
	.ConfigureStorage(storage => storage
		.UseRedis()
		.ConfigureRedis(options => options.Bind(
			builder.Configuration.GetSection("ImmediateJobs:Redis"))));
```

You can use `BindConfiguration("ImmediateJobs:Redis")` when the section comes from the
configuration registered with dependency injection.

Redis always selects distributed mode and supports queue plus recurring capabilities. It does not
support graph workflows or fair queues.

Call `ConfigureStorage` exactly once. With EF Core or LinqToDB, choose `UseSingleServer()` for one
scheduler process or `UseDistributed()` for more than one. Jobs defaults to single-server mode
when neither is selected. Redis always uses distributed mode.

<Callout type="warning" title="Database setup during preview">

Starting Jobs does not create or update a database schema. Keep every Immediate.Jobs provider
package at the same preview version as the core package. Create test databases from the current EF
model or with `CreateImmediateJobsSchemaAsync`.

Recent previews changed the schema. The EF Core server table gained required `ExpiresAt` and
`Details` columns and is indexed by `ExpiresAt`, so add a new migration after upgrading. The
LinqToDB timestamp columns changed from 64-bit integers to date-and-time types; recreate LinqToDB
databases created by an earlier preview.

</Callout>
