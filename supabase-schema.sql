-- Executar no SQL Editor do Supabase
-- Schema completo do Gerador de Proposta FV by Sol Amigo

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELAS PRINCIPAIS

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  logo_url TEXT,
  role TEXT DEFAULT 'owner',
  mfa_enabled BOOLEAN DEFAULT false,
  document TEXT,
  company_email TEXT,
  website TEXT,
  cep TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  seller_name TEXT,
  seller_phone TEXT,
  seller_email TEXT,
  default_margin_percentage NUMERIC,
  default_validity_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  cep TEXT,
  city TEXT,
  state TEXT,
  address TEXT,
  number TEXT,
  neighborhood TEXT,
  complement TEXT,
  avg_consumption_kwh NUMERIC,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  code TEXT,
  title TEXT,
  status TEXT DEFAULT 'draft',
  consumption_source TEXT,
  history JSONB,
  monthly_consumption_kwh NUMERIC,
  bill_amount NUMERIC,
  energy_tariff NUMERIC,
  kit_cost NUMERIC,
  labor_cost NUMERIC,
  fixed_costs NUMERIC,
  freight_cost NUMERIC,
  taxes NUMERIC,
  commission NUMERIC,
  other_costs NUMERIC,
  margin_percentage NUMERIC,
  discount_percentage NUMERIC,
  total_cost NUMERIC,
  gross_price NUMERIC,
  discount_value NUMERIC,
  final_price NUMERIC,
  estimated_profit NUMERIC,
  real_margin_percentage NUMERIC,
  markup_percentage NUMERIC,
  estimated_daily_consumption NUMERIC,
  pdf_url TEXT,
  public_token TEXT UNIQUE,
  sent_whatsapp_at TIMESTAMP WITH TIME ZONE,
  public_viewed_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  client_ip TEXT,
  client_user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.solar_system_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  cep TEXT,
  hsp NUMERIC,
  panel_power_w NUMERIC,
  yield_factor NUMERIC DEFAULT 0.80,
  generation_target_percent NUMERIC DEFAULT 100,
  oversizing NUMERIC DEFAULT 1.20,
  history JSONB,
  monthly_consumption_kwh NUMERIC,
  projected_consumption_kwh NUMERIC,
  required_power_kwp NUMERIC,
  panel_count INTEGER,
  installed_power_kwp NUMERIC,
  estimated_monthly_generation_kwh NUMERIC,
  excess_kwh NUMERIC,
  excess_percentage NUMERIC,
  min_inverter_power_kw NUMERIC,
  current_bill_value NUMERIC,
  energy_tariff NUMERIC,
  monthly_savings NUMERIC,
  annual_savings NUMERIC,
  payback_years NUMERIC,
  payback_months INTEGER,
  payback_formatted TEXT,
  return_25_years NUMERIC,
  net_savings_25_years NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.proposal_loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  power_watts NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  hours_per_day NUMERIC NOT NULL,
  daily_consumption NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.proposal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. DESIGN PDF / MODELOS DO USUÁRIO
-- O app atual usa IDs textuais de preset, como preset-1, preset-2 etc.
-- Se existir uma versão antiga incompatível com UUID, ela é recriada.
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

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON public.proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON public.proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_public_token ON public.proposals(public_token);
CREATE INDEX IF NOT EXISTS idx_solar_calculations_proposal_id ON public.solar_system_calculations(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_loads_proposal_id ON public.proposal_loads(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal_id ON public.proposal_events(proposal_id);
CREATE INDEX IF NOT EXISTS idx_pdf_user_models_user_id ON public.pdf_user_models(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_user_models_default ON public.pdf_user_models(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_pdf_user_models_preset_id ON public.pdf_user_models(preset_id);

-- 4. AJUSTES DE COMPATIBILIDADE E RELACIONAMENTOS

INSERT INTO public.profiles (id, name, company_name)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), ''),
  COALESCE(u.raw_user_meta_data->>'company_name', 'Minha empresa')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

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

-- 5. TRIGGERS E FUNCTIONS GERAIS

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS update_proposals_updated_at ON public.proposals;
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS update_solar_system_calculations_updated_at ON public.solar_system_calculations;
CREATE TRIGGER update_solar_system_calculations_updated_at
  BEFORE UPDATE ON public.solar_system_calculations
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS update_proposal_loads_updated_at ON public.proposal_loads;
CREATE TRIGGER update_proposal_loads_updated_at
  BEFORE UPDATE ON public.proposal_loads
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS update_pdf_user_models_updated_at ON public.pdf_user_models;
CREATE TRIGGER update_pdf_user_models_updated_at
  BEFORE UPDATE ON public.pdf_user_models
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, company_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. ROW LEVEL SECURITY E POLICIES

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_system_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_user_models ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
  END LOOP;
END $$;

CREATE POLICY "Usuário pode visualizar apenas o próprio profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuário pode inserir apenas o próprio profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuário pode atualizar apenas o próprio profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuário pode ver apenas seus clientes"
  ON public.clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário pode criar clientes para si mesmo"
  ON public.clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário pode editar apenas seus clientes"
  ON public.clients FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário pode excluir apenas seus clientes"
  ON public.clients FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário pode ver apenas suas propostas"
  ON public.proposals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário pode criar propostas para seus clientes"
  ON public.proposals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário pode editar apenas suas propostas"
  ON public.proposals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário pode excluir apenas suas propostas"
  ON public.proposals FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Leitura anonima de proposta por token"
  ON public.proposals FOR SELECT
  USING (public_token IS NOT NULL);

CREATE POLICY "Atualizacao anonima de proposta por token"
  ON public.proposals FOR UPDATE
  USING (public_token IS NOT NULL)
  WITH CHECK (public_token IS NOT NULL);

CREATE POLICY "Usuário só pode ver cálculos das próprias propostas"
  ON public.solar_system_calculations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()));

CREATE POLICY "Usuário só pode criar cálculos para as próprias propostas"
  ON public.solar_system_calculations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()));

CREATE POLICY "Usuário só pode atualizar cálculos das próprias propostas"
  ON public.solar_system_calculations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()));

CREATE POLICY "Usuário só pode deletar cálculos das próprias propostas"
  ON public.solar_system_calculations FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()));

CREATE POLICY "Usuário pode ver apenas as cargas das próprias propostas"
  ON public.proposal_loads FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()));

CREATE POLICY "Usuário pode criar cargas para as próprias propostas"
  ON public.proposal_loads FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()));

CREATE POLICY "Usuário pode editar cargas das próprias propostas"
  ON public.proposal_loads FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()));

CREATE POLICY "Usuário pode excluir cargas das próprias propostas"
  ON public.proposal_loads FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()));

CREATE POLICY "Usuario pode ler eventos das proprias propostas"
  ON public.proposal_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()));

CREATE POLICY "Usuario pode inserir eventos nas proprias propostas"
  ON public.proposal_events FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()));

CREATE POLICY "Anonimo pode inserir eventos via link publico"
  ON public.proposal_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own PDF models"
  ON public.pdf_user_models FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PDF models"
  ON public.pdf_user_models FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PDF models"
  ON public.pdf_user_models FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PDF models"
  ON public.pdf_user_models FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. STORAGE BUCKETS E POLICIES

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('pdf-assets', 'pdf-assets', true),
  ('logos', 'logos', true),
  ('proposals', 'proposals', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON storage.objects';
  END LOOP;
END $$;

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

-- 8. RPCs PÚBLICAS DA PROPOSTA

CREATE OR REPLACE FUNCTION public.get_public_proposal(p_token TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_proposal json;
BEGIN
  UPDATE public.proposals
  SET public_viewed_at = now()
  WHERE public_token = p_token AND public_viewed_at IS NULL;

  SELECT json_build_object(
    'id', p.id,
    'code', p.code,
    'title', p.title,
    'status', p.status,
    'final_price', p.final_price,
    'pdf_url', p.pdf_url,
    'public_token', p.public_token,
    'accepted_at', p.accepted_at,
    'rejected_at', p.rejected_at,
    'rejection_reason', p.rejection_reason,
    'solar', (
      SELECT row_to_json(s)
      FROM public.solar_system_calculations s
      WHERE s.proposal_id = p.id
    ),
    'client', (
      SELECT json_build_object(
        'name', c.name,
        'city', c.city,
        'state', c.state
      )
      FROM public.clients c
      WHERE c.id = p.client_id
    ),
    'company', (
      SELECT json_build_object(
        'name', prof.company_name,
        'logo_url', prof.logo_url
      )
      FROM public.profiles prof
      WHERE prof.id = p.user_id
    )
  ) INTO v_proposal
  FROM public.proposals p
  WHERE p.public_token = p_token;

  RETURN v_proposal;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_public_proposal_status(
  p_token TEXT,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_status = 'accepted' THEN
    UPDATE public.proposals
    SET
      status = 'accepted',
      accepted_at = now(),
      client_ip = p_ip,
      client_user_agent = p_user_agent
    WHERE public_token = p_token AND status NOT IN ('accepted', 'rejected');
    RETURN FOUND;
  ELSIF p_status = 'rejected' THEN
    UPDATE public.proposals
    SET
      status = 'rejected',
      rejected_at = now(),
      rejection_reason = p_reason,
      client_ip = p_ip,
      client_user_agent = p_user_agent
    WHERE public_token = p_token AND status NOT IN ('accepted', 'rejected');
    RETURN FOUND;
  END IF;

  RETURN false;
END;
$$;

-- 9. RECARREGAR CACHE DO POSTGREST
NOTIFY pgrst, 'reload schema';
