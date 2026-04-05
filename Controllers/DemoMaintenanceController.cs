using Aplicacion.Servicios.Demo;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers
{
    [ApiController]
    [Route("api/demo-maintenance")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public class DemoMaintenanceController : ControllerBase
    {
        private const string ResetKeyHeaderName = "X-Demo-Reset-Key";
        private const string CronKeyHeaderName = "X-Internal-Cron-Key";

        private readonly IDemoResetService _demoResetService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DemoMaintenanceController> _logger;

        public DemoMaintenanceController(
            IDemoResetService demoResetService,
            IConfiguration configuration,
            ILogger<DemoMaintenanceController> logger)
        {
            _demoResetService = demoResetService;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpPost("reset")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reset(CancellationToken cancellationToken)
        {
            var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "ip-desconocida";
            var ejecutadoPor = User.Identity?.Name ?? "admin-desconocido";

            var validationResult = ValidateBaseResetConfigAndPrimaryKey(
                remoteIp,
                ejecutadoPor,
                logPrefix: "DEMO_RESET");

            if (validationResult is not null)
            {
                return validationResult;
            }

            _logger.LogInformation(
                "DEMO_RESET_START ejecutadoPor={EjecutadoPor} ip={Ip}",
                ejecutadoPor,
                remoteIp);

            var resultado = await _demoResetService.ResetDemoAsync(cancellationToken);

            _logger.LogInformation(
                "DEMO_RESET_OK ejecutadoPor={EjecutadoPor} ip={Ip} deletedNonProtectedUsers={DeletedNonProtectedUsers} deletedUserRoles={DeletedUserRoles} deletedCases={DeletedCases} insertedCases={InsertedCases}",
                ejecutadoPor,
                remoteIp,
                resultado.DeletedNonProtectedUsers,
                resultado.DeletedUserRoles,
                resultado.DeletedCases,
                resultado.InsertedCases);

            return Ok(new
            {
                ok = true,
                message = "Reset de demo ejecutado correctamente.",
                executedBy = ejecutadoPor,
                data = resultado
            });
        }

        [HttpPost("reset-cron")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetCron(CancellationToken cancellationToken)
        {
            var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "ip-desconocida";
            const string ejecutadoPor = "render-cron";

            var validationResult = ValidateBaseResetConfigAndPrimaryKey(
                remoteIp,
                ejecutadoPor,
                logPrefix: "DEMO_RESET_CRON");

            if (validationResult is not null)
            {
                return validationResult;
            }

            var expectedCronKey = _configuration["DemoReset:CronKey"];
            if (string.IsNullOrWhiteSpace(expectedCronKey))
            {
                _logger.LogError(
                    "DEMO_RESET_CRON_MISCONFIGURED_CRON_KEY ejecutadoPor={EjecutadoPor} ip={Ip}",
                    ejecutadoPor,
                    remoteIp);

                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    ok = false,
                    message = "Configuración inválida del endpoint de mantenimiento."
                });
            }

            if (!Request.Headers.TryGetValue(CronKeyHeaderName, out var providedCronKeyValues))
            {
                _logger.LogWarning(
                    "DEMO_RESET_CRON_MISSING_CRON_KEY ejecutadoPor={EjecutadoPor} ip={Ip}",
                    ejecutadoPor,
                    remoteIp);

                return NotFound(new
                {
                    ok = false,
                    message = "Recurso no disponible."
                });
            }

            var providedCronKey = providedCronKeyValues.FirstOrDefault();
            if (!string.Equals(providedCronKey, expectedCronKey, StringComparison.Ordinal))
            {
                _logger.LogWarning(
                    "DEMO_RESET_CRON_INVALID_CRON_KEY ejecutadoPor={EjecutadoPor} ip={Ip}",
                    ejecutadoPor,
                    remoteIp);

                return NotFound(new
                {
                    ok = false,
                    message = "Recurso no disponible."
                });
            }

            _logger.LogInformation(
                "DEMO_RESET_CRON_START ejecutadoPor={EjecutadoPor} ip={Ip}",
                ejecutadoPor,
                remoteIp);

            var resultado = await _demoResetService.ResetDemoAsync(cancellationToken);

            _logger.LogInformation(
                "DEMO_RESET_CRON_OK ejecutadoPor={EjecutadoPor} ip={Ip} deletedNonProtectedUsers={DeletedNonProtectedUsers} deletedUserRoles={DeletedUserRoles} deletedCases={DeletedCases} insertedCases={InsertedCases}",
                ejecutadoPor,
                remoteIp,
                resultado.DeletedNonProtectedUsers,
                resultado.DeletedUserRoles,
                resultado.DeletedCases,
                resultado.InsertedCases);

            return Ok(new
            {
                ok = true,
                message = "Reset nocturno de demo ejecutado correctamente.",
                executedBy = ejecutadoPor,
                data = resultado
            });
        }

        private IActionResult? ValidateBaseResetConfigAndPrimaryKey(
            string remoteIp,
            string ejecutadoPor,
            string logPrefix)
        {
            var resetEnabled = _configuration.GetValue<bool>("DemoReset:Enabled");
            if (!resetEnabled)
            {
                _logger.LogWarning(
                    "{LogPrefix}_DISABLED ejecutadoPor={EjecutadoPor} ip={Ip}",
                    logPrefix,
                    ejecutadoPor,
                    remoteIp);

                return NotFound(new
                {
                    ok = false,
                    message = "Recurso no disponible."
                });
            }

            var expectedKey = _configuration["DemoReset:Key"];
            if (string.IsNullOrWhiteSpace(expectedKey))
            {
                _logger.LogError(
                    "{LogPrefix}_MISCONFIGURED ejecutadoPor={EjecutadoPor} ip={Ip}",
                    logPrefix,
                    ejecutadoPor,
                    remoteIp);

                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    ok = false,
                    message = "Configuración inválida del endpoint de mantenimiento."
                });
            }

            if (!Request.Headers.TryGetValue(ResetKeyHeaderName, out var providedKeyValues))
            {
                _logger.LogWarning(
                    "{LogPrefix}_MISSING_KEY ejecutadoPor={EjecutadoPor} ip={Ip}",
                    logPrefix,
                    ejecutadoPor,
                    remoteIp);

                return NotFound(new
                {
                    ok = false,
                    message = "Recurso no disponible."
                });
            }

            var providedKey = providedKeyValues.FirstOrDefault();
            if (!string.Equals(providedKey, expectedKey, StringComparison.Ordinal))
            {
                _logger.LogWarning(
                    "{LogPrefix}_INVALID_KEY ejecutadoPor={EjecutadoPor} ip={Ip}",
                    logPrefix,
                    ejecutadoPor,
                    remoteIp);

                return NotFound(new
                {
                    ok = false,
                    message = "Recurso no disponible."
                });
            }

            return null;
        }
    }
}