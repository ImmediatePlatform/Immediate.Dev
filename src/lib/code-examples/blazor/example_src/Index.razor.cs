public sealed partial class Index : BlazorComponentBase
{
	public sealed class TodoItem
	{
		public required TodoId TodoId { get; set; }
		public required string Name { get; set; }
		public required bool IsComplete { get; set; }
	}

	[Inject]
	private GetTodos.Handler GetTodos { get; init; } = null!;

	[Inject]
	private CreateTodo.Handler CreateTodo { get; init; } = null!;

	[Inject]
	private CompleteTodo.Handler CompleteTodo { get; init; } = null!;

	private List<TodoItem> _todos = null!;
	private bool _showCompleted;
	private string _newTodoText = "";

	protected override Task OnAfterRenderAsync(bool firstRender)
	{
		if (!firstRender)
			return Task.CompletedTask;

		return LoadTodos();
	}

	private async Task LoadTodos(bool newState = false)
	{
		_showCompleted = newState;

		var todos = await GetTodos.HandleAsync(new(
		{
			 ShowCompleted = _showCompleted, 
		}));
		_todos = todos
			.Select(t => new TodoItem
			{
				TodoId = t.TodoId,
				Name = t.Name,
				IsComplete = t.TodoStatus == TodoStatus.Completed,
			})
			.ToList();

		StateHasChanged();
	}

	private async Task AddTodo()
	{
		var todo = await CreateTodo.HandleAsync(
			new()
			{
				Name = _newTodoText,
				TodoPriority = TodoPriority.Mid,
				TodoStatus = TodoStatus.Active,
			}
		);

		_todos.Add(new()
		{
			TodoId = todo.TodoId,
			Name = todo.Name,
			IsComplete = false,
		});
		_newTodoText = "";
	}

	private async Task Complete(TodoItem t)
	{
		_ = await CompleteTodo.HandleAsync(
			new()
			{
				TodoId = t.TodoId,
				Completed = !t.IsComplete,
			}
		);

		if (!t.IsComplete && !_showCompleted)
		{
			_ = _todos.Remove(t);
			StateHasChanged();
		}
		else
		{
			t.IsComplete = !t.IsComplete;
		}
	}
}