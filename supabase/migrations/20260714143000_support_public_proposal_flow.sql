-- =========================================================
-- Suporte ao fluxo público da proposta
-- =========================================================
-- Esta migration garante os campos usados pela página pública
-- e cria RPCs seguras para visualização e aceite/recusa por token.

alter table public.proposals
  add column if not exists public_token text,
  add column if not exists pdf_url text,
  add column if not exists sent_whatsapp_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists public_viewed_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists client_ip text,
  add column if not exists client_user_agent text,
  add column if not exists selected_solar_kit_id uuid references public.solar_kits(id) on delete set null,
  add column if not exists solar_kit_snapshot jsonb;

-- Garante token público para propostas antigas que ainda não possuírem link.
update public.proposals
set public_token = replace(gen_random_uuid()::text, '-', '')
where public_token is null;

create unique index if not exists proposals_public_token_unique_idx
  on public.proposals(public_token)
  where public_token is not null;

create index if not exists proposals_public_status_idx
  on public.proposals(public_token, status)
  where public_token is not null;

create index if not exists proposals_public_viewed_at_idx
  on public.proposals(public_viewed_at);

create index if not exists proposals_selected_solar_kit_id_idx
  on public.proposals(selected_solar_kit_id);

-- =========================================================
-- RPC: buscar proposta pública por token
-- =========================================================
create or replace function public.get_public_proposal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals%rowtype;
  v_client jsonb;
  v_profile jsonb;
  v_solar jsonb;
  v_company jsonb;
begin
  select *
  into v_proposal
  from public.proposals
  where public_token = p_token
  limit 1;

  if not found then
    return null;
  end if;

  -- Marca primeira visualização pública e muda sent/pending para viewed.
  if v_proposal.public_viewed_at is null then
    update public.proposals
    set
      public_viewed_at = now(),
      status = case
        when status in ('sent', 'pending') then 'viewed'
        else status
      end
    where id = v_proposal.id
    returning * into v_proposal;
  end if;

  select to_jsonb(c)
  into v_client
  from (
    select name, city, state, document, email, phone
    from public.clients
    where id = v_proposal.client_id
  ) c;

  select to_jsonb(p)
  into v_profile
  from (
    select
      company_name,
      logo_url,
      seller_name,
      seller_phone,
      seller_email,
      website,
      company_email,
      default_validity_days,
      default_margin_percentage
    from public.profiles
    where id = v_proposal.user_id
  ) p;

  select to_jsonb(s)
  into v_solar
  from (
    select *
    from public.solar_system_calculations
    where proposal_id = v_proposal.id
    limit 1
  ) s;

  v_company := jsonb_build_object(
    'name', coalesce(v_profile ->> 'company_name', 'Empresa de Energia Solar'),
    'logo_url', coalesce(v_profile ->> 'logo_url', ''),
    'email', coalesce(v_profile ->> 'company_email', ''),
    'website', coalesce(v_profile ->> 'website', '')
  );

  return to_jsonb(v_proposal)
    || jsonb_build_object(
      'client', coalesce(v_client, 'null'::jsonb),
      'profile', coalesce(v_profile, 'null'::jsonb),
      'solar', coalesce(v_solar, 'null'::jsonb),
      'company', v_company
    );
end;
$$;

-- =========================================================
-- RPC: aceitar ou recusar proposta pública por token
-- =========================================================
create or replace function public.update_public_proposal_status(
  p_token text,
  p_status text,
  p_reason text default null,
  p_ip text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal_id uuid;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'Status público inválido: %', p_status;
  end if;

  update public.proposals
  set
    status = p_status,
    accepted_at = case when p_status = 'approved' then now() else accepted_at end,
    rejected_at = case when p_status = 'rejected' then now() else rejected_at end,
    rejection_reason = case when p_status = 'rejected' then nullif(p_reason, '') else rejection_reason end,
    client_ip = p_ip,
    client_user_agent = p_user_agent
  where public_token = p_token
    and status in ('draft', 'sent', 'pending', 'viewed')
  returning id into v_proposal_id;

  if v_proposal_id is null then
    raise exception 'Proposta não encontrada ou não disponível para avaliação.';
  end if;

  return jsonb_build_object(
    'id', v_proposal_id,
    'status', p_status
  );
end;
$$;

revoke all on function public.get_public_proposal(text) from public;
revoke all on function public.update_public_proposal_status(text, text, text, text, text) from public;

grant execute on function public.get_public_proposal(text) to anon, authenticated;
grant execute on function public.update_public_proposal_status(text, text, text, text, text) to anon, authenticated;
