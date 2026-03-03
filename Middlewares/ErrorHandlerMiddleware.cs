using Aplicacion.Excepciones;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace API.Middlewares
{
    public class ErrorHandlerMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ErrorHandlerMiddleware> _logger;
        private readonly IWebHostEnvironment _env;
        public ErrorHandlerMiddleware(RequestDelegate next, ILogger<ErrorHandlerMiddleware> logger, IWebHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }
        public async Task Invoke(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                var traceId = context.TraceIdentifier;
                _logger.LogError(ex, "❌ Error no controlado. TraceId={TraceId}", traceId);
                var isDbError = IsDatabaseException(ex);
                var statusCode = ex switch
                {
                    NotFoundException => StatusCodes.Status404NotFound,
                    BusinessConflictException => StatusCodes.Status409Conflict,
                    DomainException => StatusCodes.Status400BadRequest,
                    _ when isDbError => StatusCodes.Status503ServiceUnavailable,
                    _ => StatusCodes.Status500InternalServerError
                };
  
                context.Response.StatusCode = statusCode;
                context.Response.ContentType = "application/json";
                var title = statusCode switch
                {
                    404 => "Recurso no encontrado",
                    409 => "Conflicto de negocio",
                    400 => "Solicitud inválida",
                    503 => "Servicio no disponible",
                    _ => "Error interno del servidor"
                };

                // 🔒 En prod NO filtramos detalle interno
                var safeDetail =
                             (statusCode is 500 or 503) && !_env.IsDevelopment()
                                 ? "Servicio temporalmente no disponible. Intenta nuevamente."
                                 : ex.Message;

                var problem = new ProblemDetails
                {
                    Status = statusCode,
                    Title = title,                 // ✅ usa el title que ya calculaste arriba
                    Detail = safeDetail,
                    Instance = context.Request.Path
                };
                problem.Extensions["traceId"] = traceId;
                var json = JsonSerializer.Serialize(problem, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });
                await context.Response.WriteAsync(json);
            }
        }

        private static bool IsDatabaseException(Exception ex)
        {
            if (ex is null) return false;

            // 1) Recorrer cadena normal
            for (var cur = ex; cur != null; cur = cur.InnerException)
            {
                if (cur is SqlException) return true;
                if (cur is DbUpdateException) return true;

                // timeouts típicos de conexión / comando
                if (cur is TimeoutException) return true;
                if (cur is TaskCanceledException) return true;
                if (cur is OperationCanceledException) return true;
            }

            // 2) AggregateException (muy común con async/EF)
            if (ex is AggregateException agg)
            {
                foreach (var inner in agg.Flatten().InnerExceptions)
                {
                    if (IsDatabaseException(inner)) return true;
                }
            }

            return false;
        }
    }
}
