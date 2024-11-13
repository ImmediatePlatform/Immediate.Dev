var builder = WebApplication.CreateBuilder(args);

builder.Services.AddWebHandlers();
builder.Services.AddWebBehaviors();
builder.Services.AddAntiforgery();

builder.Services.AddEntityFrameworkNpgsql()
    .AddDbContext<ExampleDbContext>();

builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseStaticFiles();

app.UseRouting();

app.UseAntiforgery();

app.UseEndpoints(endpoints =>
{
    endpoints.MapBlazorServerExampleEndpoints();

    app.MapRazorComponents<App>()
        .AddInteractiveServerRenderMode();
});

app.Run();