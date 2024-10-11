namespace WebApiExample.Features.Todos.Models;

public static class Mapper
{
    public static Todo ToDto(this Database.Models.Todo dbTodo)
        => new(dbTodo.Id, dbTodo.IsCompleted, dbTodo.Name, dbTodo.Description);
}