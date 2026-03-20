using Infraestructura.Persistencia;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
namespace API.Controllers
{
    [ApiController]
    [Route("api/system")]
    public class SystemController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<SystemController> _logger;

        private static readonly object _lock = new();
        private static DateTime _lastWarmupUtc = DateTime.MinValue;
        private static readonly TimeSpan _cooldown = TimeSpan.FromSeconds(90);

        public SystemController(AppDbContext context, ILogger<SystemController> logger)
        {
            _context = context;
            _logger = logger;
        }
        [HttpGet("ping")]
        public IActionResult Ping()
        {
            var sw = Stopwatch.StartNew();

            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var userAgent = Request.Headers["User-Agent"].ToString();
            var origin = Request.Headers["Origin"].ToString();

            sw.Stop();

            _logger.LogInformation(
                "PING_OK ip={IP} origin={Origin} userAgent={UserAgent} totalMs={TotalMs}",
                ip, origin, userAgent, sw.ElapsedMilliseconds);

            return Ok(new
            {
                ok = true,
                totalMs = sw.ElapsedMilliseconds
            });
        }

        [HttpGet("warmup")]
        public async Task<IActionResult> Warmup(CancellationToken cancellationToken)
        {
            var totalSw = Stopwatch.StartNew();

            var now = DateTime.UtcNow;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var userAgent = Request.Headers["User-Agent"].ToString();
            var origin = Request.Headers["Origin"].ToString();

            lock (_lock)
            {
                if (now - _lastWarmupUtc < _cooldown)
                {
                    totalSw.Stop();

                    _logger.LogInformation(
                        "WARMUP_CACHE_HIT ip={IP} origin={Origin} userAgent={UserAgent} totalMs={TotalMs}",
                        ip, origin, userAgent, totalSw.ElapsedMilliseconds);

                    return Ok(new
                    {
                        ok = true,
                        cached = true,
                        totalMs = totalSw.ElapsedMilliseconds
                    });
                }
            }

            try
            {
                var dbSw = Stopwatch.StartNew();

                await _context.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken);

                dbSw.Stop();

                lock (_lock)
                {
                    _lastWarmupUtc = now;
                }

                totalSw.Stop();

                _logger.LogInformation(
                    "WARMUP_OK ip={IP} origin={Origin} userAgent={UserAgent} dbMs={DbMs} totalMs={TotalMs}",
                    ip, origin, userAgent, dbSw.ElapsedMilliseconds, totalSw.ElapsedMilliseconds);

                return Ok(new
                {
                    ok = true,
                    cached = false,
                    dbMs = dbSw.ElapsedMilliseconds,
                    totalMs = totalSw.ElapsedMilliseconds
                });
            }
            catch (Exception ex)
            {
                totalSw.Stop();

                _logger.LogWarning(
                    ex,
                    "WARMUP_FAIL ip={IP} origin={Origin} userAgent={UserAgent} totalMs={TotalMs}",
                    ip, origin, userAgent, totalSw.ElapsedMilliseconds);

                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    ok = false,
                    totalMs = totalSw.ElapsedMilliseconds
                });
            }
        }
    }
}