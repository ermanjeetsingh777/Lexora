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
    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
    public DbSet<SupportTicketMessage> SupportTicketMessages => Set<SupportTicketMessage>();
    public DbSet<SupportTicketAttachment> SupportTicketAttachments => Set<SupportTicketAttachment>();
    public DbSet<KnowledgeBaseArticle> KnowledgeBaseArticles => Set<KnowledgeBaseArticle>();
    public DbSet<SystemIncident> SystemIncidents => Set<SystemIncident>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<BookLoan> BookLoans => Set<BookLoan>();
    public DbSet<BookAuditEntry> BookAuditEntries => Set<BookAuditEntry>();
    public DbSet<UserNotification> UserNotifications => Set<UserNotification>();
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

            entity.Property(x => x.DefaultLoanDays).HasDefaultValue(14);
            entity.Property(x => x.OverdueFinePerDay).HasPrecision(18, 2).HasDefaultValue(10m);
            entity.Property(x => x.AttendanceQrToken).HasMaxLength(64).IsRequired();
            entity.HasIndex(x => x.AttendanceQrToken).IsUnique();
        });

        builder.Entity<Member>(entity =>
        {
            entity.Property(x => x.PhotoStoragePath).HasMaxLength(500);
            entity.Property(x => x.PhotoFileName).HasMaxLength(260);
        });

        builder.Entity<SupportTicket>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Subject).HasMaxLength(300).IsRequired();
            entity.Property(x => x.RequesterUserId).HasMaxLength(450).IsRequired();
            entity.Property(x => x.RequesterName).HasMaxLength(200).IsRequired();
            entity.Property(x => x.RequesterEmail).HasMaxLength(255);
            entity.Property(x => x.OwnerName).HasMaxLength(200);
            entity.Property(x => x.Channel).HasMaxLength(50);
            entity.HasIndex(x => new { x.RequesterUserId, x.Status, x.IsDeleted });
        });

        builder.Entity<SupportTicketMessage>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.AuthorUserId).HasMaxLength(450).IsRequired();
            entity.Property(x => x.AuthorName).HasMaxLength(200).IsRequired();
            entity.Property(x => x.AuthorRole).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Body).HasMaxLength(4000).IsRequired();
            entity.HasOne(x => x.Ticket)
                .WithMany(x => x.Messages)
                .HasForeignKey(x => x.TicketId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<SupportTicketAttachment>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.FileName).HasMaxLength(255).IsRequired();
            entity.Property(x => x.ContentType).HasMaxLength(120).IsRequired();
            entity.Property(x => x.StoragePath).HasMaxLength(500).IsRequired();
            entity.Property(x => x.UploadedByUserId).HasMaxLength(450).IsRequired();
            entity.HasOne(x => x.Ticket)
                .WithMany(x => x.Attachments)
                .HasForeignKey(x => x.TicketId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Message)
                .WithMany(x => x.Attachments)
                .HasForeignKey(x => x.MessageId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        builder.Entity<KnowledgeBaseArticle>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(300).IsRequired();
            entity.Property(x => x.Category).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Tags).HasMaxLength(500);
            entity.HasIndex(x => new { x.Category, x.IsDeleted });
        });

        builder.Entity<SystemIncident>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(300).IsRequired();
            entity.Property(x => x.Severity).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(50).IsRequired();
            entity.Property(x => x.AffectedComponents).HasMaxLength(1000);
        });

        builder.Entity<SystemIncidentUpdate>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Phase).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Body).HasMaxLength(2000).IsRequired();
            entity.HasOne(x => x.Incident)
                .WithMany(x => x.Updates)
                .HasForeignKey(x => x.IncidentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Book>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(300).IsRequired();
            entity.Property(x => x.Author).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Category).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Isbn).HasMaxLength(20).IsRequired();
            entity.Property(x => x.PdfStoragePath).HasMaxLength(500);
            entity.Property(x => x.PdfFileName).HasMaxLength(260);
            entity.HasIndex(x => new { x.LibraryId, x.Isbn, x.IsDeleted });
            entity.HasOne(x => x.Library)
                .WithMany()
                .HasForeignKey(x => x.LibraryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<BookLoan>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.MemberName).HasMaxLength(200).IsRequired();
            entity.HasOne(x => x.Book)
                .WithMany(x => x.Loans)
                .HasForeignKey(x => x.BookId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Member)
                .WithMany()
                .HasForeignKey(x => x.MemberId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.FineAmount).HasPrecision(18, 2);
            entity.HasIndex(x => new { x.MemberId, x.Status, x.IsDeleted });
        });

        builder.Entity<UserNotification>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.UserId).HasMaxLength(450).IsRequired();
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Message).HasMaxLength(1000).IsRequired();
            entity.Property(x => x.NotificationType).HasMaxLength(50).IsRequired();
            entity.HasIndex(x => new { x.UserId, x.IsRead, x.CreatedAtUtc });
        });

        builder.Entity<BookAuditEntry>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ActorUserId).HasMaxLength(450).IsRequired();
            entity.Property(x => x.ActorName).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Note).HasMaxLength(500);
            entity.HasOne(x => x.Book)
                .WithMany(x => x.AuditEntries)
                .HasForeignKey(x => x.BookId)
                .OnDelete(DeleteBehavior.Cascade);
        });


    }
}
