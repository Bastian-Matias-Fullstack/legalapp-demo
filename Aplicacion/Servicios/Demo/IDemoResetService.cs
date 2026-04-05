using System.Threading;
using System.Threading.Tasks;

namespace Aplicacion.Servicios.Demo
{
    public interface IDemoResetService
    {
        Task<DemoResetResult> ResetDemoAsync(CancellationToken cancellationToken = default);
    }
}