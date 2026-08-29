using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SLMS_API.Domain.Entities
{
    public class UserPackageAddon
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public string UserId { get; set; } = string.Empty;

        public Guid? UserPackageId { get; set; }

        [Required]
        public Guid AddonId { get; set; }

        public int Quantity { get; set; } = 1;

        public int TotalExtraQuantity { get; set; } = 1;

        public decimal AmountPaid { get; set; }

        public DateTime StartDateUtc { get; set; } = DateTime.UtcNow;

        public DateTime EndDateUtc { get; set; }

        [MaxLength(50)]
        public string PaymentStatus { get; set; } = "Paid";

        [MaxLength(100)]
        public string? TransactionId { get; set; }

        [MaxLength(50)]
        public string? PaymentMethod { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        #region Navigation Properties

        [ForeignKey(nameof(UserId))]
        public virtual ApplicationUser User { get; set; } = null!;

        [ForeignKey(nameof(UserPackageId))]
        public virtual UserPackage? UserPackage { get; set; }

        [ForeignKey(nameof(AddonId))]
        public virtual Addon Addon { get; set; } = null!;

        #endregion
    }
}
