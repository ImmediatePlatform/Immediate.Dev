using FluentValidationExample.Database.Models;
using Microsoft.EntityFrameworkCore;

namespace FluentValidationExample.Database;

public sealed class ExampleDbContext(IConfiguration configuration) : DbContext
{
    public DbSet<Todo> Todos => Set<Todo>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseNpgsql(configuration.GetConnectionString("PostgresConnectionString"));

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Todo>(builder =>
        {
            builder.HasKey(e => e.Id);
            builder.Property(e => e.Name).HasMaxLength(64);
            builder.Property(e => e.Description).HasMaxLength(4096);
        });
    }
}
