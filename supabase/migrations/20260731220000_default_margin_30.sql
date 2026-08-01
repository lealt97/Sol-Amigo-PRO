-- Margem comercial padrão para propostas novas.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_margin_percentage NUMERIC;

ALTER TABLE public.profiles
  ALTER COLUMN default_margin_percentage SET DEFAULT 30;

UPDATE public.profiles
SET default_margin_percentage = 30
WHERE default_margin_percentage IS NULL;
