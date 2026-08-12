ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS weekly_hours jsonb;
ALTER TABLE public.libraries ADD COLUMN IF NOT EXISTS weekly_hours jsonb;