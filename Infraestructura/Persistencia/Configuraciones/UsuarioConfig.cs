using Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infraestructura.Persistencia.Configuraciones
{
    public class UsuarioConfig : IEntityTypeConfiguration<Usuario>
    {
        public void Configure(EntityTypeBuilder<Usuario> builder)
        {
            builder.ToTable("Usuarios"); // Nombre de la tabla en la BD

            builder.HasKey(u => u.Id); // Clave primaria

            builder.Property(u => u.Nombre)
                   .HasMaxLength(100) // Máximo 100 caracteres
                   .IsRequired(); // No puede ser nulo

            builder.Property(u => u.Email)
                   .HasMaxLength(150)
                   .IsRequired();

            builder.HasIndex(u => u.Email) // Agrega un índice único
                   .IsUnique();
        }
    }
}
