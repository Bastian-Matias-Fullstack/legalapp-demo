using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Aplicacion.Servicios.Demo;
using Dominio.Entidades;
using Infraestructura.Persistencia;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infraestructura.Servicios
{
    public class DemoResetService : IDemoResetService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<DemoResetService> _logger;

        public DemoResetService(
            AppDbContext context,
            ILogger<DemoResetService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<DemoResetResult> ResetDemoAsync(CancellationToken cancellationToken = default)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                await AcquireDemoResetLockAsync(cancellationToken);
                // 1) Buscar usuarios NO protegidos
                var nonProtectedUserIds = await _context.Usuarios
                    .Where(u => !u.EsDemoProtegido)
                    .Select(u => u.Id)
                    .ToListAsync(cancellationToken);

                // 2) Borrar UsuarioRoles de usuarios NO protegidos
                var userRolesToDelete = await _context.UsuarioRoles
                    .Where(ur => nonProtectedUserIds.Contains(ur.UsuarioId))
                    .ToListAsync(cancellationToken);

                var deletedUserRoles = userRolesToDelete.Count;

                if (deletedUserRoles > 0)
                {
                    _context.UsuarioRoles.RemoveRange(userRolesToDelete);
                    await _context.SaveChangesAsync(cancellationToken);
                }

                // 3) Borrar usuarios NO protegidos
                var usersToDelete = await _context.Usuarios
                    .Where(u => !u.EsDemoProtegido)
                    .ToListAsync(cancellationToken);

                var deletedNonProtectedUsers = usersToDelete.Count;

                if (deletedNonProtectedUsers > 0)
                {
                    _context.Usuarios.RemoveRange(usersToDelete);
                    await _context.SaveChangesAsync(cancellationToken);
                }

                // 4) Borrar todos los casos
                var casosToDelete = await _context.Casos.ToListAsync(cancellationToken);
                var deletedCases = casosToDelete.Count;

                if (deletedCases > 0)
                {
                    _context.Casos.RemoveRange(casosToDelete);
                    await _context.SaveChangesAsync(cancellationToken);
                }

                // 5) Resetear identity de Casos
                await _context.Database.ExecuteSqlRawAsync(
                    "DBCC CHECKIDENT ('dbo.Casos', RESEED, 0);",
                    cancellationToken);

                // 6) Insertar baseline limpio
                var casosBase = DemoResetBaseline.GetCasosBase();

                var nuevosCasos = casosBase.Select(seed => new Caso
                {
                    Titulo = seed.Titulo,
                    Descripcion = seed.Descripcion,
                    NombreCliente = seed.NombreCliente,
                    TipoCaso = (TipoCaso)seed.TipoCaso,
                    FechaCreacion = new DateTimeOffset(seed.FechaCreacion),
                    Estado = MapEstadoCaso(seed.Estado),
                    ClienteId = seed.ClienteId,
                    FechaCambioEstado = seed.FechaCambioEstado,
                    FechaCierre = seed.FechaCierre,
                    MotivoCierre = seed.MotivoCierre,
                    CreatedBy = seed.CreatedBy,
                    ModifiedBy = seed.ModifiedBy,
                    UpdatedAt = seed.UpdatedAt.HasValue
                        ? new DateTimeOffset(seed.UpdatedAt.Value)
                        : null
                }).ToList();

                await _context.Casos.AddRangeAsync(nuevosCasos, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                var insertedCases = nuevosCasos.Count;

                await transaction.CommitAsync(cancellationToken);

                _logger.LogInformation(
                    "DEMO_RESET_SERVICE_OK deletedNonProtectedUsers={DeletedNonProtectedUsers} deletedUserRoles={DeletedUserRoles} deletedCases={DeletedCases} insertedCases={InsertedCases}",
                    deletedNonProtectedUsers,
                    deletedUserRoles,
                    deletedCases,
                    insertedCases);

                return new DemoResetResult
                {
                    DeletedNonProtectedUsers = deletedNonProtectedUsers,
                    DeletedUserRoles = deletedUserRoles,
                    DeletedCases = deletedCases,
                    InsertedCases = insertedCases
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);

                _logger.LogError(ex, "DEMO_RESET_SERVICE_ERROR");

                throw;
            }
        }
        private async Task AcquireDemoResetLockAsync(CancellationToken cancellationToken)
        {
            const string sql = """
                DECLARE @result int;

                EXEC @result = sp_getapplock
                    @Resource = 'LegalApp:DemoReset',
                    @LockMode = 'Exclusive',
                    @LockOwner = 'Transaction',
                    @LockTimeout = 5000;

                IF (@result < 0)
                BEGIN
                    THROW 51000, 'No se pudo obtener el lock exclusivo para el reset de demo.', 1;
                END
                """;

            await _context.Database.ExecuteSqlRawAsync(sql, cancellationToken);
        }

        private static EstadoCaso MapEstadoCaso(string estado)
        {
            return estado switch
            {
                "Pendiente" => EstadoCaso.Pendiente,
                "EnProceso" => EstadoCaso.EnProceso,
                "Cerrado" => EstadoCaso.Cerrado,
                _ => throw new InvalidOperationException($"Estado no soportado en baseline: {estado}")
            };
        }
    }
}