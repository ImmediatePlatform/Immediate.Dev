namespace BlazorServerExample.Database.Models;

public sealed class Todo
{
    public int Id { get; set; }

    public bool IsCompleted { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }
}