-- Setup incremental: modelos PDF do usuário no Supabase
-- Use este arquivo no SQL Editor do Supabase para habilitar o Design PDF persistente.
-- Ele é equivalente à migration supabase/migrations/20260706_pdf_user_models.sql.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO public.profiles (id, name, company_name)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), ''),
  COALESCE(u.raw_user_meta_data->>'company_name', 'Minha empresa')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  ALTER TABLE public.proposals
    DROP CONSTRAINT IF EXISTS proposals_user_id_profiles_fkey;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proposals_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.proposals
      ADD CONSTRAINT proposals_user_id_profiles_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pdf_user_models'
      AND column_name = 'preset_id'
      AND data_type = 'uuid'
  ) OR EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pdf_user_models'
      AND column_name = 'id'
      AND data_type = 'uuid'
  ) THEN
    DROP TABLE public.pdf_user_models CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.pdf_user_models (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_id TEXT NOT NULL,
  source_model_id TEXT REFERENCES public.pdf_user_models(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  theme JSONB NOT NULL DEFAULT '{"primary":"#0A2249","secondary":"#C49133","accent":"#FACB5C","neutral":"#1F2A2A"}'::jsonb,
  logo_url TEXT,
  cover_image_url TEXT,
  logo_transform JSONB NOT NULL DEFAULT '{"zoom":1,"x":0,"y":0,"rotate":0}'::jsonb,
  cover_image_transform JSONB NOT NULL DEFAULT '{"zoom":1,"x":0,"y":0,"rotate":0}'::jsonb,
  page_config JSONB NOT NULL DEFAULT '{"order":["cover","intro","technical","financial","payback"],"visiblePages":{"cover":true,"intro":true,"technical":true,"financial":true,"payback":true}}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pdf_user_models_user_id ON public.pdf_user_models(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_user_models_default ON public.pdf_user_models(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_pdf_user_models_preset_id ON public.pdf_user_models(preset_id);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pdf_user_models_updated_at ON public.pdf_user_models;
CREATE TRIGGER update_pdf_user_models_updated_at
  BEFORE UPDATE ON public.pdf_user_models
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

ALTER TABLE public.pdf_user_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own PDF models" ON public.pdf_user_models;
DROP POLICY IF EXISTS "Users can insert their own PDF models" ON public.pdf_user_models;
DROP POLICY IF EXISTS "Users can update their own PDF models" ON public.pdf_user_models;
DROP POLICY IF EXISTS "Users can delete their own PDF models" ON public.pdf_user_models;
DROP POLICY IF EXISTS "Users can view their own models" ON public.pdf_user_models;
DROP POLICY IF EXISTS "Users can insert their own models" ON public.pdf_user_models;
DROP POLICY IF EXISTS "Users can update their own models" ON public.pdf_user_models;
DROP POLICY IF EXISTS "Users can delete their own models" ON public.pdf_user_models;

CREATE POLICY "Users can view their own PDF models"
  ON public.pdf_user_models
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PDF models"
  ON public.pdf_user_models
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PDF models"
  ON public.pdf_user_models
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PDF models"
  ON public.pdf_user_models
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('pdf-assets', 'pdf-assets', true),
  ('logos', 'logos', true),
  ('proposals', 'proposals', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public read pdf-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload pdf-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update pdf-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete pdf-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Public read proposals PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload proposals PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update proposals PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete proposals PDFs" ON storage.objects;

CREATE POLICY "Public read pdf-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdf-assets');

CREATE POLICY "Authenticated upload pdf-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pdf-assets');

CREATE POLICY "Authenticated update pdf-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pdf-assets')
  WITH CHECK (bucket_id = 'pdf-assets');

CREATE POLICY "Authenticated delete pdf-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pdf-assets');

CREATE POLICY "Public read logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Authenticated upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Authenticated update logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'logos')
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Authenticated delete logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'logos');

CREATE POLICY "Public read proposals PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'proposals');

CREATE POLICY "Authenticated upload proposals PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'proposals' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated update proposals PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'proposals' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'proposals' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated delete proposals PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'proposals' AND (storage.foldername(name))[1] = auth.uid()::text);

NOTIFY pgrst, 'reload schema';
