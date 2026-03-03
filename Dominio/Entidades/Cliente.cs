using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Dominio.Entidades
{
    public class Cliente
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Rut { get; set; } = string.Empty;

        public ICollection<Caso> Casos { get; set; } = new List<Caso>();



        public Cliente(string rut, string nombre)
        {
            Rut = rut;
            Nombre = nombre;
        }
        // ✅ Constructor vacío requerido por EF Core

        public Cliente() { }


    }

}
