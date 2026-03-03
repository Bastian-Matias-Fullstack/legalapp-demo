using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Dominio.Entidades
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum EstadoCaso
    {
        Pendiente = 1,
        EnProceso = 2,
        Cerrado = 3
    }
}
