var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHandlers();
builder.Services.AddBehaviors();

var app = builder.Build();

app.MapMyWebAppEndpoints();

app.Run();