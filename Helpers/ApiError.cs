using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;


/*helper ApiError necesita el HttpContext para rellenar Instance = context.Request.Path.

Entonces… ¡todos tus controladores actuales pueden usar esta clase sin hacer nada extra! /*/
/* Centralizas los errores.

Evitas repetir código.

Estás aplicando DRY y buenas prácticas realistas.

Compatible con cualquier ControllerBase.

 */
namespace API.Helpers
{
    public static class ApiError
    {
        public static ProblemDetails BadRequest(string message, HttpContext httpContext) =>
            CreateProblemDetails(StatusCodes.Status400BadRequest, "Solicitud inválida", message, httpContext);

        public static ProblemDetails NotFound(string message, HttpContext httpContext) =>
            CreateProblemDetails(StatusCodes.Status404NotFound, "No encontrado", message, httpContext);

        public static ProblemDetails InternalError(string message, HttpContext httpContext) =>
            CreateProblemDetails(StatusCodes.Status500InternalServerError, "Error interno del servidor", message, httpContext);

        private static ProblemDetails CreateProblemDetails(int statusCode, string title, string detail, HttpContext context)
        {
            return new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = detail,
                Instance = context.Request.Path
            };
        }
    }
}
