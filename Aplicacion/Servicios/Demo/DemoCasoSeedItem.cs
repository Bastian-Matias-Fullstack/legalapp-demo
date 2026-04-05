namespace Aplicacion.Servicios.Demo
{
    public class DemoCasoSeedItem
    {
        public string Titulo { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;
        public string NombreCliente { get; set; } = string.Empty;
        public int TipoCaso { get; set; }
        public DateTime FechaCreacion { get; set; }
        public string Estado { get; set; } = string.Empty;
        public int ClienteId { get; set; }
        public DateTime? FechaCambioEstado { get; set; }
        public DateTime? FechaCierre { get; set; }
        public string? MotivoCierre { get; set; }
        public string CreatedBy { get; set; } = "seed";
        public string? ModifiedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}