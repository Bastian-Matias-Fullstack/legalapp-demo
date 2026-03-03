using Dominio.Entidades;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Aplicacion.DTO
{
    public class CasoConClienteDto
    {
        public int Id { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;
        public EstadoCaso Estado { get; set; }
        public DateTime FechaCreacion { get; set; }

        public int ClienteId { get; set; }
        public string NombreCliente { get; set; } = string.Empty;
    }
}
