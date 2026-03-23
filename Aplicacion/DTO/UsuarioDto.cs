namespace Aplicacion.Usuarios.DTO
{
    public class UsuarioDto
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = null!;
        public string Email { get; set; } = null!;
        public bool EsDemoProtegido { get; set; }
        public List<string> Roles { get; set; } = new();
    }
}
