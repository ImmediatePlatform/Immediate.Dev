using Immediate.Validations.Shared;
using Microsoft.AspNetCore.Mvc;
using WebApiExample;
using WebApiExample.Database;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.CustomSchemaIds(x => x.FullName?.Replace("+", ".", StringComparison.Ordinal));
});

builder.Services.AddHandlers();
builder.Services.AddBehaviors();

builder.Services.AddEntityFrameworkNpgsql()
    .AddDbContext<ExampleDbContext>();

builder.Services.AddProblemDetails(ConfigureProblemDetails);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapWebApiExampleEndpoints();

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