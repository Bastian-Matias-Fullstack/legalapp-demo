using System.Collections.Concurrent;

namespace Aplicacion.Servicios.Auth;

// Servicio de aplicación que mantiene en memoria el estado de intentos fallidos por email.
// Se usa para bloquear temporalmente una cuenta después de varios intentos fallidos.
public class LoginLockoutService : ILoginLockoutService
{
    // Clase interna privada que representa el estado de lockout de un email.
    // Guarda cuántos intentos fallidos lleva y hasta cuándo queda bloqueado.
    private sealed class Entry
    {
        public int FailedCount { get; set; }
        public DateTimeOffset? LockedUntilUtc { get; set; }
    }

    // Diccionario concurrente para almacenar el estado de lockout por email normalizado.
    // Se usa ConcurrentDictionary porque múltiples requests de login pueden ocurrir al mismo tiempo.
    private readonly ConcurrentDictionary<string, Entry> _entries = new();

    private const int MaxFailedAttempts = 5;

    // Regla de negocio: duración del bloqueo temporal.
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);


    // Verifica si un email actualmente está bloqueado.
    // Devuelve true si sigue dentro de la ventana de lockout.
    // Devuelve false si no existe entrada, si nunca fue bloqueado o si el bloqueo ya expiró.
    public bool IsLocked(string email, out DateTimeOffset lockedUntilUtc)
    {
        lockedUntilUtc = default;
        var key = Normalize(email);

        if (!_entries.TryGetValue(key, out var entry))
            return false;

        if (entry.LockedUntilUtc is null)
            return false;

        if (entry.LockedUntilUtc > DateTimeOffset.UtcNow)
        {
            lockedUntilUtc = entry.LockedUntilUtc.Value;
            return true;
        }

        _entries.TryRemove(key, out _);
        return false;
    }

    // Registra un intento fallido de login para un email.
    // Si llega al máximo permitido, aplica lockout temporal.
    // Retorna el contador actual de fallos y opcionalmente la fecha de bloqueo.
    public int RegisterFailure(string email, out DateTimeOffset? lockedUntilUtc)
    {
        var key = Normalize(email);

        var entry = _entries.AddOrUpdate(
            key,
            _ => new Entry { FailedCount = 1 },
            (_, existing) =>
            {
                if (existing.LockedUntilUtc is not null &&
                    existing.LockedUntilUtc > DateTimeOffset.UtcNow)
                {
                    return existing;
                }

                existing.FailedCount++;

                if (existing.FailedCount >= MaxFailedAttempts)
                {
                    existing.LockedUntilUtc = DateTimeOffset.UtcNow.Add(LockoutDuration);
                }

                return existing;
            });

        lockedUntilUtc = entry.LockedUntilUtc;
        return entry.FailedCount;
    }

    // Limpia el estado de lockout de un email.
    // Se usa después de un login exitoso para reiniciar el contador.
    public void Reset(string email)
    {
        var key = Normalize(email);
        _entries.TryRemove(key, out _);
    }

    // Normaliza el email para evitar inconsistencias:
    // - quita espacios
    // - convierte a minúsculas
    // Así el lockout siempre trabaja sobre una clave uniforme.
    private static string Normalize(string email) =>
        (email ?? string.Empty).Trim().ToLowerInvariant();
}