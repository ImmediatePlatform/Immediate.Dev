var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHandlers();
builder.Services.AddBehaviors();

builder.Services.AddEntityFrameworkNpgsql()
    .AddDbContext<ExampleDbContext>();

// See full cookbook example for 
// ConfigureProblemDetails implementation
builder.Services.AddProblemDetails(ConfigureProblemDetails);

var app = builder.Build();

app.MapWebApiExampleEndpoints();

app.Run();