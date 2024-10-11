namespace WebApiExample.Features.Todos.Models;

public sealed record Todo(int Id, bool IsCompleted, string Name, string? Description);