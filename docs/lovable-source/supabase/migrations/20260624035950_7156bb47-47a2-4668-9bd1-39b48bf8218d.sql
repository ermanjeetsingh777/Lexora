
-- updated_at helper (reuse if exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===== invoices =====
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  number text NOT NULL,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'due' CHECK (status IN ('paid','due','failed','refunded')),
  period_start date,
  period_end date,
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoices_institution_idx ON public.invoices(institution_id, issued_at DESC);
CREATE UNIQUE INDEX invoices_number_per_inst ON public.invoices(institution_id, number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage invoices" ON public.invoices
  FOR ALL
  USING (public.owns_institution(auth.uid(), institution_id))
  WITH CHECK (public.owns_institution(auth.uid(), institution_id));

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== payment_methods =====
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  brand text NOT NULL,
  last4 text NOT NULL CHECK (char_length(last4) = 4),
  exp_month int NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year int NOT NULL CHECK (exp_year BETWEEN 2000 AND 2100),
  holder text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_methods_institution_idx ON public.payment_methods(institution_id);
CREATE UNIQUE INDEX payment_methods_one_default
  ON public.payment_methods(institution_id) WHERE is_default;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage payment methods" ON public.payment_methods
  FOR ALL
  USING (public.owns_institution(auth.uid(), institution_id))
  WITH CHECK (public.owns_institution(auth.uid(), institution_id));

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
