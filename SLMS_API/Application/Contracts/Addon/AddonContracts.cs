namespace SLMS_API.Application.Contracts.Addon
{
    public class AddonResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        /// <summary>Institution | Branch | Library | User | Member</summary>
        public string ResourceType { get; set; } = string.Empty;
        public int UnitQuantity { get; set; } = 1;
        public decimal Price { get; set; }
        public int DurationInDays { get; set; } = 365;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class CreateAddonRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string ResourceType { get; set; } = "Library";
        public int UnitQuantity { get; set; } = 1;
        public decimal Price { get; set; }
        public int DurationInDays { get; set; } = 365;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateAddonRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string ResourceType { get; set; } = "Library";
        public int UnitQuantity { get; set; } = 1;
        public decimal Price { get; set; }
        public int DurationInDays { get; set; } = 365;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
    }

    public class PurchaseAddonRequest
    {
        public Guid AddonId { get; set; }
        public int Quantity { get; set; } = 1;
        public string? PaymentMethod { get; set; }
        public string? TransactionId { get; set; }
    }

    public class UserAddonResponse
    {
        public Guid Id { get; set; }
        public Guid AddonId { get; set; }
        public string AddonName { get; set; } = string.Empty;
        public string AddonCode { get; set; } = string.Empty;
        public string ResourceType { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public int TotalExtraQuantity { get; set; }
        public decimal AmountPaid { get; set; }
        public DateTime StartDateUtc { get; set; }
        public DateTime EndDateUtc { get; set; }
        public string PaymentStatus { get; set; } = "Paid";
        public bool IsActive { get; set; }
    }
}
