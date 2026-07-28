using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpotifyAllTime.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SpotifyUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SpotifyUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AccessToken = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RefreshToken = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TokenExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TargetPlaylistId = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpotifyUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StreamingRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SpotifyUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SpotifyTrackUri = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PlayedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MsPlayed = table.Column<int>(type: "int", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StreamingRecords", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tracks",
                columns: table => new
                {
                    SpotifyTrackUri = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TrackName = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    ArtistName = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    AlbumName = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    PlayCount = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tracks", x => x.SpotifyTrackUri);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SpotifyUsers_SpotifyUserId",
                table: "SpotifyUsers",
                column: "SpotifyUserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StreamingRecords_SpotifyUserId_SpotifyTrackUri_PlayedAt",
                table: "StreamingRecords",
                columns: new[] { "SpotifyUserId", "SpotifyTrackUri", "PlayedAt" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SpotifyUsers");

            migrationBuilder.DropTable(
                name: "StreamingRecords");

            migrationBuilder.DropTable(
                name: "Tracks");
        }
    }
}
