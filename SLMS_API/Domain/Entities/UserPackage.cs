using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SLMS_API.Domain.Entities
{
    public class UserPackage
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public string UserId { get; set; } = string.Empty;

        [Required]
        public Guid PackageId { get; set; }

        public DateTime StartDateUtc { get; set; } = DateTime.UtcNow;

        public DateTime EndDateUtc { get; set; }

        public decimal AmountPaid { get; set; }

        public decimal AdjustmentAmount { get; set; }

        public bool AutoRenew { get; set; }
        public bool IsActive { get; set; }

        public bool IsCurrentPackage { get; set; } = true;

        [MaxLength(50)]
        public string PaymentStatus { get; set; } = "Pending";

        [MaxLength(100)]
        public string? TransactionId { get; set; }

        [MaxLength(50)]
        public string? PaymentMethod { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAtUtc { get; set; }

        #region Navigation Properties

        [ForeignKey(nameof(UserId))]
        public virtual ApplicationUser User { get; set; } = null!;

        [ForeignKey(nameof(PackageId))]
        public virtual Package Package { get; set; } = null!;
        #endregion
    }
}
