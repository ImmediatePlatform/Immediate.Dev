using BlazorServerExample;
using BlazorServerExample.Components;
using BlazorServerExample.Database;
using Immediate.Validations.Shared;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddHandlers();
builder.Services.AddBehaviors();
builder.Services.AddAntiforgery();

builder.Services.AddEntityFrameworkNpgsql()
    .AddDbContext<ExampleDbContext>();

builder.Services.AddProblemDetails(ConfigureProblemDetails);

builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
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

static void ConfigureProblemDetails(ProblemDetailsOptions options) =>
    options.CustomizeProblemDetails = c =>
    {
        if (c.Exception is null)
            return;

        c.ProblemDetails = c.Exception switch
        {
            ValidationException ex => new ValidationProblemDetails(
                ex
                    .Errors
                    .GroupBy(x => x.PropertyName, StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(
                        x => x.Key,
                        x => x.Select(e => e.ErrorMessage).ToArray(),
                        StringComparer.OrdinalIgnoreCase
                    )
            )
            {
                Status = StatusCodes.Status400BadRequest,
            },

            // other exception handling as desired goes here

            _ => new ProblemDetails
            {
                Detail = "An error has occurred.",
                Status = StatusCodes.Status500InternalServerError,
            },
        };

        c.HttpContext.Response.StatusCode = c.ProblemDetails.Status ?? StatusCodes.Status500InternalServerError;
    };