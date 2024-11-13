// This example uses the excellent 
// CliFx library by Tyrrrz
// https://github.com/Tyrrrz/CliFx

await new CliApplicationBuilder()
    .AddCommandsFromThisAssembly()
    .UseTypeActivator(commandTypes =>
    {
        var services = new ServiceCollection();

        // Register services
        services.AddCliHandlers();

        // Register commands
        foreach (var commandType in commandTypes)
            services.AddTransient(commandType);

        return services.BuildServiceProvider();
    })
    .Build()
    .RunAsync();