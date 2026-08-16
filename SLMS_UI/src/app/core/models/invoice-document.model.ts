export interface InvoiceDocumentLineItem {
  label: string;
  qty: number;
  unit: number;
  amount: number;
}

export interface InvoiceDocumentInstitution {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface InvoiceDocument {
  id: string;
  number: string;
  issuedAtUtc: string;
  paidAtUtc?: string | null;
  planStartDate?: string | null;
  planEndDate?: string | null;
  amount: number;
  status: string;
  currency?: string;
  memberName?: string | null;
  planName?: string | null;
  description?: string | null;
  institution?: InvoiceDocumentInstitution;
  lineItems?: InvoiceDocumentLineItem[];
  notes?: string | null;
}
