using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace NexusApi.Data;

public class NexusDbContextFactory : IDesignTimeDbContextFactory<NexusDbContext>
{
    public NexusDbContext CreateDbContext(string[] args)
    {
        var opts = new DbContextOptionsBuilder<NexusDbContext>()
            .UseNpgsql("Host=localhost;Database=nexus_design;Username=nexus;Password=nexus")
            .Options;
        return new NexusDbContext(opts);
    }
}
