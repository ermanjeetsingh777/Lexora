using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SLMS_API.Domain.Entities;

namespace SLMS_API.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole, string>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Package> Packages => Set<Package>();
    public DbSet<PackageFeatures> PackageFeatures => Set<PackageFeatures>();
    public DbSet<UserPackage> UserPackages => Set<UserPackage>();
    public DbSet<Institution> Institutions => Set<Institution>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Library> Libraries => Set<Library>();
    public DbSet<Member> Members => Set<Member>();


    public DbSet<UserInstitution> UserInstitutions => Set<UserInstitution>();
    public DbSet<UserBranch> UserBranches => Set<UserBranch>();
    public DbSet<UserLibrary> UserLibraries => Set<UserLibrary>();
    public DbSet<MemberLibrary> MemberLibraries => Set<MemberLibrary>();
    public DbSet<MemberGuardianContact> MemberGuardianContacts => Set<MemberGuardianContact>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<MemberPlan> MemberPlans => Set<MemberPlan>();
    public DbSet<MemberAttendance> MemberAttendances => Set<MemberAttendance>();
    public DbSet<Seat> Seats => Set<Seat>();
    public DbSet<MemberTransferHistory> MemberTransferHistory => Set<MemberTransferHistory>();
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Token).HasMaxLength(256).IsRequired();
            entity.Property(x => x.UserId).HasMaxLength(450).IsRequired();
            entity.HasIndex(x => x.Token).IsUnique();
            entity.HasIndex(x => new { x.UserId, x.ExpiresAtUtc });
            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.EventType).HasMaxLength(100).IsRequired();
            entity.Property(x => x.UserId).HasMaxLength(450);
            entity.Property(x => x.IpAddress).HasMaxLength(64);
            entity.HasIndex(x => x.CreatedAtUtc);
            entity.HasIndex(x => new { x.EventType, x.CreatedAtUtc });
        });

        builder.Entity<OtpCode>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.UserId).HasMaxLength(450).IsRequired();
            entity.Property(x => x.Code).HasMaxLength(10).IsRequired();
            entity.HasIndex(x => new { x.UserId, x.Purpose, x.IsUsed, x.ExpiresAtUtc });
            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Permission>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.Code).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
            entity.HasIndex(x => x.Code).IsUnique();
            entity.HasData(PermissionSeedData.GetAll());
        });

        builder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.RoleId).HasMaxLength(450).IsRequired();
            entity.HasIndex(x => new { x.RoleId, x.PermissionId }).IsUnique();
            entity.HasOne(x => x.Role)
                .WithMany()
                .HasForeignKey(x => x.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Permission)
                .WithMany()
                .HasForeignKey(x => x.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Institution>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(255).IsRequired();
            entity.Property(x => x.Type).HasMaxLength(50);
            entity.Property(x => x.Email).HasMaxLength(255);
            entity.Property(x => x.Phone).HasMaxLength(20);
            entity.HasIndex(x => new { x.IsDeleted, x.IsActive });
        });

        builder.Entity<Branch>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(255).IsRequired();
            entity.Property(x => x.Latitude).HasPrecision(9, 6);
            entity.Property(x => x.Longitude).HasPrecision(9, 6);
            entity.HasIndex(x => new { x.InstitutionId });
            entity.HasOne(x => x.Institution)
                .WithMany(x => x.Branches)
                .HasForeignKey(x => x.InstitutionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Library>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name)
                  .HasMaxLength(255)
                  .IsRequired();

            entity.HasOne(x => x.Institution)
                  .WithMany(x => x.Libraries)
                  .HasForeignKey(x => x.InstitutionId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Branch)
                  .WithMany(x => x.Libraries)
                  .HasForeignKey(x => x.BranchId)
                  .OnDelete(DeleteBehavior.Restrict);
        });


    }
}
