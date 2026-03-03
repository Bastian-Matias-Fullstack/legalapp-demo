using Aplicacion.Servicios.Auth;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Dominio.Entidades;

namespace Infraestructura.Servicios
{
    public class HashService : IHashService
    {
        private readonly PasswordHasher<Usuario> _hasher = new();

        public string Hash(string password)
        {
            return _hasher.HashPassword(null!, password);
        }

        public bool Verificar(string textoPlano, string hashAlmacenado)
        {
            var resultado = _hasher.VerifyHashedPassword(null!, hashAlmacenado, textoPlano);
            return resultado == PasswordVerificationResult.Success;
        }
    }
}
