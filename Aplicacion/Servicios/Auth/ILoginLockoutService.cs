namespace Aplicacion.Servicios.Auth;

public interface ILoginLockoutService
{
    bool IsLocked(string email, out DateTimeOffset lockedUntilUtc);
    int RegisterFailure(string email, out DateTimeOffset? lockedUntilUtc);
    void Reset(string email);
}