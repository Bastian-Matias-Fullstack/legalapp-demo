using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

[JsonConverter(typeof(JsonStringEnumConverter))] // 🔥 Esta línea es la clave para swagger con sus datos 

public enum TipoCaso
{
    Laboral = 1,
    Penal = 2,
    Civil = 3,
    Familia = 4,
    Cobranza = 5
}
