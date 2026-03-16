// nexus-api/NexusApi/Services/LogBuffer.cs
using Serilog.Core;
using Serilog.Events;
using Serilog.Formatting.Display;

namespace NexusApi.Services;

/// <summary>
/// Thread-safe in-memory ring buffer for recent log lines, readable via the /api/logs endpoint.
/// </summary>
public sealed class LogBuffer
{
    private readonly List<string> _lines = [];
    private readonly Lock _lock = new();
    private const int MaxLines = 5_000;

    public void Append(string line)
    {
        lock (_lock)
        {
            _lines.Add(line);
            if (_lines.Count > MaxLines)
                _lines.RemoveRange(0, _lines.Count - MaxLines);
        }
    }

    public (IReadOnlyList<string> Lines, int Total) Read(int offset, int limit)
    {
        lock (_lock)
        {
            var total = _lines.Count;
            if (offset >= total) return ([], total);
            var slice = _lines.Skip(offset).Take(Math.Min(limit, 500)).ToList();
            return (slice, total);
        }
    }
}

/// <summary>
/// Serilog sink that feeds log events into the LogBuffer.
/// </summary>
public sealed class LogBufferSink(LogBuffer buffer) : ILogEventSink
{
    private static readonly MessageTemplateTextFormatter Formatter =
        new("[{Timestamp:HH:mm:ss}] {Level:u3} {SourceContext}: {Message}{NewLine}{Exception}",
            null);

    public void Emit(LogEvent logEvent)
    {
        using var writer = new StringWriter();
        Formatter.Format(logEvent, writer);
        buffer.Append(writer.ToString().TrimEnd());
    }
}
