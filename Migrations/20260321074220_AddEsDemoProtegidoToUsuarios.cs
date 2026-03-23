using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AddEsDemoProtegidoToUsuarios : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EsDemoProtegido",
                table: "Usuarios",
                type: "bit",
                nullable: false,
                defaultValue: false);
            migrationBuilder.Sql(@"
           UPDATE Usuarios
           SET EsDemoProtegido = 1
           WHERE Email IN ('admin@legal.cl', 'abogado@legal.cl', 'soporte@legal.cl');
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EsDemoProtegido",
                table: "Usuarios");
        }
    }
}
