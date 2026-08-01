-- Executar no SQL Editor do Supabase

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELAS

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
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
  default_margin_percentage NUMERIC DEFAULT 30,
  default_validity_days INTEGER DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Clients
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

-- Proposals
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

-- Solar System Calculations
CREATE TABLE IF NOT EXISTS public.solar_system_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  cep TEXT,
  hsp NUMERIC,
  panel_power_w NUMERIC,
  yield_factor NUMERIC DEFAULT 0.80,
  generation_target_percent NUMERIC DEFAULT 100,
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

-- Proposal Loads
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

-- PDF Cover Templates
CREATE TABLE IF NOT EXISTS public.pdf_cover_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  svg_file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- PDF Templates
CREATE TABLE IF NOT EXISTS public.pdf_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cover_template_id UUID REFERENCES public.pdf_cover_templates(id),
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#1e3a8a',
  accent_color TEXT DEFAULT '#10b981',
  background_color TEXT DEFAULT '#09090b',
  logo_url TEXT,
  cover_photo_url TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Proposal Events
CREATE TABLE IF NOT EXISTS public.proposal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TRIGGERS E FUNCTIONS GERAIS
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
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

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS update_proposal_loads_updated_at ON public.proposal_loads;
CREATE TRIGGER update_proposal_loads_updated_at
  BEFORE UPDATE ON public.proposal_loads
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Trigger para criar o profile automaticamente ao criar usuário no Auth
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, company_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. ROW LEVEL SECURITY (RLS) E POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_system_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_cover_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas para evitar erros de duplicidade
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Profiles Policies
CREATE POLICY "Usuário pode visualizar apenas o próprio profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuário pode atualizar apenas o próprio profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuário pode inserir apenas o próprio profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Clients Policies
CREATE POLICY "Usuário pode ver apenas seus clientes" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário pode criar clientes para si mesmo" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário pode editar apenas seus clientes" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário pode excluir apenas seus clientes" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- Proposals Policies
CREATE POLICY "Usuário pode ver apenas suas propostas" ON public.proposals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário pode criar propostas para seus clientes" ON public.proposals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário pode editar apenas suas propostas" ON public.proposals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário pode excluir apenas suas propostas" ON public.proposals FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Leitura anonima de proposta por token" ON public.proposals FOR SELECT USING (public_token IS NOT NULL);
CREATE POLICY "Atualizacao anonima de proposta por token" ON public.proposals FOR UPDATE USING (public_token IS NOT NULL);

-- Solar System Calculations Policies
CREATE POLICY "Usuário só pode ver cálculos das próprias propostas" ON public.solar_system_calculations FOR SELECT USING (EXISTS (SELECT 1 FROM public.proposals WHERE id = proposal_id AND user_id = auth.uid()));
CREATE POLICY "Usuário só pode criar cálculos para as próprias propostas" ON public.solar_system_calculations FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.proposals WHERE id = proposal_id AND user_id = auth.uid()));
CREATE POLICY "Usuário só pode atualizar cálculos das próprias propostas" ON public.solar_system_calculations FOR UPDATE USING (EXISTS (SELECT 1 FROM public.proposals WHERE id = proposal_id AND user_id = auth.uid()));
CREATE POLICY "Usuário só pode deletar cálculos das próprias propostas" ON public.solar_system_calculations FOR DELETE USING (EXISTS (SELECT 1 FROM public.proposals WHERE id = proposal_id AND user_id = auth.uid()));

-- Proposal Loads Policies
CREATE POLICY "Usuário pode ver apenas as cargas das próprias propostas" ON public.proposal_loads FOR SELECT USING (EXISTS (SELECT 1 FROM public.proposals WHERE id = proposal_id AND user_id = auth.uid()));
CREATE POLICY "Usuário pode criar cargas para as próprias propostas" ON public.proposal_loads FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.proposals WHERE id = proposal_id AND user_id = auth.uid()));
CREATE POLICY "Usuário pode editar cargas das próprias propostas" ON public.proposal_loads FOR UPDATE USING (EXISTS (SELECT 1 FROM public.proposals WHERE id = proposal_id AND user_id = auth.uid()));
CREATE POLICY "Usuário pode excluir cargas das próprias propostas" ON public.proposal_loads FOR DELETE USING (EXISTS (SELECT 1 FROM public.proposals WHERE id = proposal_id AND user_id = auth.uid()));

-- PDF Cover Templates Policies
CREATE POLICY "Templates de capa sao visiveis para todos os usuarios autenticados" ON public.pdf_cover_templates FOR SELECT TO authenticated USING (true);

-- PDF Templates Policies
CREATE POLICY "Usuarios podem ver seus proprios templates de pdf" ON public.pdf_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuarios podem inserir seus proprios templates de pdf" ON public.pdf_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios podem atualizar seus proprios templates de pdf" ON public.pdf_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuarios podem deletar seus proprios templates de pdf" ON public.pdf_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Proposal Events Policies
CREATE POLICY "Usuario pode ler eventos das proprias propostas" ON public.proposal_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()));
CREATE POLICY "Usuario pode inserir eventos nas proprias propostas" ON public.proposal_events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.user_id = auth.uid()));
CREATE POLICY "Anonimo pode inserir eventos via link publico" ON public.proposal_events FOR INSERT WITH CHECK (true);

-- 5. BUCKETS STORAGE E POLICIES
INSERT INTO storage.buckets (id, name, public) VALUES ('pdf-assets', 'pdf-assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'storage') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON storage.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Policies para pdf-assets
CREATE POLICY "Leitura pública para pdf-assets" ON storage.objects FOR SELECT USING (bucket_id = 'pdf-assets');
CREATE POLICY "Upload para pdf-assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pdf-assets');
CREATE POLICY "Atualização para pdf-assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'pdf-assets');
CREATE POLICY "Exclusão para pdf-assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pdf-assets');

-- Policies para logos
CREATE POLICY "Public Access for logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Users can upload logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Users can update their logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos');
CREATE POLICY "Users can delete their logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos');

-- 6. FUNCTIONS (RPC)
DROP FUNCTION IF EXISTS public.get_public_proposal(text) CASCADE;
CREATE OR REPLACE FUNCTION public.get_public_proposal(p_token TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_proposal json;
BEGIN
  -- Marca como visualizada se ainda nao foi
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

DROP FUNCTION IF EXISTS public.update_public_proposal_status(text, text, text, text, text) CASCADE;
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
CREATE TABLE IF NOT EXISTS public.pdf_template_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  thumbnail_url TEXT,
  svg_content TEXT,
  default_theme JSONB,
  page_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.pdf_user_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_id UUID REFERENCES public.pdf_template_presets(id) ON DELETE SET NULL,
  source_model_id UUID REFERENCES public.pdf_user_models(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  theme JSONB,
  logo_url TEXT,
  cover_image_url TEXT,
  logo_transform JSONB,
  cover_image_transform JSONB,
  page_config JSONB,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.pdf_template_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_user_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Presets are viewable by all users" ON public.pdf_template_presets
  FOR SELECT USING (true);

CREATE POLICY "Users can view their own models" ON public.pdf_user_models
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own models" ON public.pdf_user_models
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own models" ON public.pdf_user_models
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own models" ON public.pdf_user_models
  FOR DELETE USING (auth.uid() = user_id);

-- 7. USER ACCOUNT DELETION FUNCTION (RPC)
-- Permite que usuários autenticados excluam sua própria conta com segurança
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;




-- 8. RASCUNHOS PERSISTENTES DO FLUXO DE PROPOSTA
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS flow_step SMALLINT,
  ADD COLUMN IF NOT EXISTS flow_state JSONB,
  ADD COLUMN IF NOT EXISTS flow_version INTEGER,
  ADD COLUMN IF NOT EXISTS flow_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flow_last_saved_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.proposals'::regclass
      AND conname = 'proposals_flow_step_range'
  ) THEN
    ALTER TABLE public.proposals
      ADD CONSTRAINT proposals_flow_step_range
      CHECK (flow_step IS NULL OR flow_step BETWEEN 0 AND 6);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS proposals_active_flow_drafts_idx
  ON public.proposals (user_id, client_id, updated_at DESC)
  WHERE status = 'draft'
    AND flow_completed = false
    AND flow_state IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS proposals_one_active_flow_draft_per_client_uidx
  ON public.proposals (user_id, client_id)
  WHERE status = 'draft'
    AND flow_completed = false
    AND flow_state IS NOT NULL;

DROP POLICY IF EXISTS "Usuário pode editar apenas suas propostas" ON public.proposals;
CREATE POLICY "Usuário pode editar apenas suas propostas"
  ON public.proposals
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- Compatibilidade elétrica dos kits solares
-- Compatibilidade elétrica dos kits solares
alter table public.solar_kits
  add column if not exists grid_connection_type text
    check (grid_connection_type is null or grid_connection_type in ('monophase', 'biphase', 'triphase')),
  add column if not exists grid_voltage_v numeric
    check (grid_voltage_v is null or grid_voltage_v > 0);

comment on column public.solar_kits.grid_connection_type is
  'Tipo de ligação da unidade consumidora para a qual o kit foi configurado.';
comment on column public.solar_kits.grid_voltage_v is
  'Tensão nominal de conexão do kit, em volts.';
