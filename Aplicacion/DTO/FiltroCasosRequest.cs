using Swashbuckle.AspNetCore.Annotations;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Aplicacion.DTOs
{
    public class FiltroCasosRequest
    {
        [SwaggerSchema("Número de página que deseas ver", Nullable = false)]
        public int Pagina { get; set; } = 1;

        [SwaggerSchema("Cantidad de elementos por página", Nullable = false)]
        public int Tamanio { get; set; } = 10;

        [SwaggerSchema("Filtrar por estado: 'Pendiente' o 'Cerrado'")]
        public string? Estado { get; set; }

        [SwaggerSchema("Buscar por título o nombre del cliente")]
        public string? Buscar { get; set; }

        [SwaggerSchema("Orden: 'fecha_desc', 'fecha_asc', 'titulo_asc', 'titulo_desc'")]
        public string? Orden { get; set; }

        [SwaggerSchema("Fecha desde (YYYY-MM-DD)")]
        public DateTime? Desde { get; set; }

        [SwaggerSchema("Fecha hasta (YYYY-MM-DD)")]
        public DateTime? Hasta { get; set; }
    }
}
