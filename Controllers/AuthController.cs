using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Aplicacion.Servicios.Auth;
using Aplicacion.DTO;
using Infraestructura.Persistencia;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IJwtService _jwtService;
    private readonly AppDbContext _context;
    private readonly IHashService _hashService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext context,  IJwtService jwtService, IHashService hashService, ILogger<AuthController> logger)
    {
        _jwtService = jwtService;
        _context = context;
        _hashService = hashService;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        const string credencialesInvalidas = "Credenciales inválidas";
        
            /* aqui usamos EF CORE YA QUE ES CONSULTA SIMPLE */
            var usuario = await _context.Usuarios
           .Include(u => u.UsuarioRoles)
           .ThenInclude(ur => ur.Rol)
           .FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (usuario == null)
                return Unauthorized(credencialesInvalidas);


            // Verificar contraseña con IHashService
            var esValida = _hashService.Verificar(dto.Password, usuario.PasswordHash);
            if (!esValida)
                return Unauthorized(credencialesInvalidas);

            // Extraer los nombres de los roles
            var roles = usuario.UsuarioRoles.Select(ur => ur.Rol.Nombre).ToList();
            // Generar token JWT
            var token = _jwtService.GenerarToken(usuario.Email, usuario.Id, roles);

            return Ok(new { token });
       
    }
}
