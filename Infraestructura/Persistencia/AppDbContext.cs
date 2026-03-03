using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Dominio.Entidades;

namespace Infraestructura.Persistencia
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options){ }

        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Caso> Casos { get; set; } 
        public DbSet<Cliente> Clientes { get; set; }
        public DbSet<Rol> Roles { get; set; }
        public DbSet<UsuarioRol> UsuarioRoles { get; set; }

        /*   Esto le dice a EF: "Busca todas las clases que implementen IEntityTypeConfiguration<T> y aplícalas automáticamente".*/
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder); 
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
            modelBuilder.Entity<Caso>()   // 1º Bloque: Relaciones
            .HasOne(c => c.Cliente)
            .WithMany(cl => cl.Casos)
            .HasForeignKey(c => c.ClienteId)
             .OnDelete(DeleteBehavior.Restrict);

            //separados siempre 
             modelBuilder.Entity<Caso>() // 2º Bloque: Configuración de propiedades
             .Property(c => c.Estado)
             .HasConversion<string>();
            // Relación N:N Usuario <-> Rol a través de UsuarioRol
            modelBuilder.Entity<UsuarioRol>()
                .HasKey(ur => new { ur.UsuarioId, ur.RolId });

            modelBuilder.Entity<UsuarioRol>()
                .HasOne(ur => ur.Usuario)
                .WithMany(u => u.UsuarioRoles)
                .HasForeignKey(ur => ur.UsuarioId);

            modelBuilder.Entity<UsuarioRol>()
                .HasOne(ur => ur.Rol)
                .WithMany(r => r.UsuarioRoles)
                .HasForeignKey(ur => ur.RolId);

            // Semilla de roles
            /*✔️ Perfecto para pruebas y para evitar tener que crearlos a mano.
            */
            modelBuilder.Entity<Rol>().HasData(
                new Rol { Id = 1, Nombre = "Admin" },
                new Rol { Id = 2, Nombre = "Abogado" },
                new Rol { Id = 3, Nombre = "Soporte" }
            );
        }

    }
}
