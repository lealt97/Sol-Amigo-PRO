-- =========================================================
-- Ciclo de vida dos tokens públicos de propostas
--
-- Tokens legados permanecem válidos quando não possuem data de expiração.
-- Novos tokens recebem validade baseada na configuração da conta (7 dias
-- quando não configurada) e podem ser revogados ou renovados pelo proprietário.
-- =========================================================

alter table public.proposals
  add column if not exists public_token_expires_at timestamptz,
  add column if not exists public_token_revoked_at timestamptz;

comment on column public.proposals.public_token_expires_at is
  'Data limite para uso do link público. NULL preserva tokens legados sem expiração.';
comment on column public.proposals.public_token_revoked_at is
  'Data de revogação do link público. Quando preenchida, o token deixa de funcionar imediatamente.';

create or replace function public.set_public_token_lifecycle()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_validity_days integer;
begin
  if new.public_token is null then
    return new;
  end if;

  if tg_op = 'INSERT' or new.public_token is distinct from old.public_token then
    new.public_token_revoked_at := null;

    if new.public_token_expires_at is null then
      select p.default_validity_days
        into v_validity_days
      from public.profiles p
      where p.id = new.user_id;

      v_validity_days := greatest(1, least(coalesce(v_validity_days, 7), 365));
      new.public_token_expires_at := now() + make_interval(days => v_validity_days);
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.set_public_token_lifecycle() from public, anon, authenticated;

drop trigger if exists set_public_token_lifecycle_on_proposals on public.proposals;
create trigger set_public_token_lifecycle_on_proposals
  before insert or update of public_token on public.proposals
  for each row execute function public.set_public_token_lifecycle();

create or replace function public.revoke_public_proposal_token(p_proposal_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_revoked boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  update public.proposals p
  set public_token_revoked_at = coalesce(p.public_token_revoked_at, now())
  where p.id = p_proposal_id
    and p.user_id = auth.uid()
    and p.public_token is not null
  returning true into v_revoked;

  if coalesce(v_revoked, false) then
    insert into public.proposal_events (
      proposal_id,
      user_id,
      event_type,
      description,
      metadata
    ) values (
      p_proposal_id,
      auth.uid(),
      'public_token_revoked',
      'Link público da proposta revogado pelo proprietário.',
      jsonb_build_object('source', 'authenticated_rpc')
    );
  end if;

  return coalesce(v_revoked, false);
end;
$$;

create or replace function public.rotate_public_proposal_token(
  p_proposal_id uuid,
  p_validity_days integer default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_validity_days integer;
  v_token text;
  v_expires_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if p_validity_days is not null and (p_validity_days < 1 or p_validity_days > 365) then
    raise exception 'A validade do link deve estar entre 1 e 365 dias.' using errcode = '22023';
  end if;

  select coalesce(p_validity_days, prof.default_validity_days, 7)
    into v_validity_days
  from public.proposals p
  left join public.profiles prof on prof.id = p.user_id
  where p.id = p_proposal_id
    and p.user_id = auth.uid();

  if v_validity_days is null then
    raise exception 'Proposta não encontrada.' using errcode = 'P0002';
  end if;

  v_validity_days := greatest(1, least(v_validity_days, 365));
  v_token := replace(gen_random_uuid()::text, '-', '');
  v_expires_at := now() + make_interval(days => v_validity_days);

  update public.proposals p
  set
    public_token = v_token,
    public_token_expires_at = v_expires_at,
    public_token_revoked_at = null
  where p.id = p_proposal_id
    and p.user_id = auth.uid();

  insert into public.proposal_events (
    proposal_id,
    user_id,
    event_type,
    description,
    metadata
  ) values (
    p_proposal_id,
    auth.uid(),
    'public_token_rotated',
    'Novo link público gerado pelo proprietário.',
    jsonb_build_object(
      'source', 'authenticated_rpc',
      'validity_days', v_validity_days,
      'expires_at', v_expires_at
    )
  );

  return jsonb_build_object(
    'public_token', v_token,
    'expires_at', v_expires_at,
    'validity_days', v_validity_days
  );
end;
$$;

revoke all on function public.revoke_public_proposal_token(uuid) from public, anon;
revoke all on function public.rotate_public_proposal_token(uuid, integer) from public, anon;
grant execute on function public.revoke_public_proposal_token(uuid) to authenticated, service_role;
grant execute on function public.rotate_public_proposal_token(uuid, integer) to authenticated, service_role;

create or replace function public.get_public_proposal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_proposal_id uuid;
  v_status text;
  v_first_view boolean := false;
  v_payload jsonb;
begin
  if p_token is null or length(trim(p_token)) < 20 or length(p_token) > 128 then
    return null;
  end if;

  select p.id, p.status
    into v_proposal_id, v_status
  from public.proposals p
  where p.public_token = trim(p_token)
    and p.public_token_revoked_at is null
    and (p.public_token_expires_at is null or p.public_token_expires_at > now())
  limit 1;

  if v_proposal_id is null then
    return null;
  end if;

  update public.proposals
  set
    public_viewed_at = now(),
    status = case
      when status in ('draft', 'pending', 'sent') then 'viewed'
      else status
    end
  where id = v_proposal_id
    and public_viewed_at is null;

  v_first_view := found;

  if v_first_view then
    insert into public.proposal_events (
      proposal_id,
      user_id,
      event_type,
      description,
      metadata
    ) values (
      v_proposal_id,
      null,
      'public_viewed',
      'Cliente visualizou a proposta pelo link público',
      jsonb_build_object('source', 'public_rpc')
    );
  end if;

  select jsonb_build_object(
    'id', p.id,
    'code', p.code,
    'title', p.title,
    'status', p.status,
    'final_price', p.final_price,
    'accepted_at', p.accepted_at,
    'rejected_at', p.rejected_at,
    'rejection_reason', p.rejection_reason,
    'public_viewed_at', p.public_viewed_at,
    'public_token_expires_at', p.public_token_expires_at,
    'created_at', p.created_at,
    'pdf_available', (p.pdf_storage_path is not null or p.pdf_url is not null),
    'client', case when c.id is null then null else jsonb_build_object(
      'name', c.name,
      'city', c.city,
      'state', c.state
    ) end,
    'profile', case when prof.id is null then null else jsonb_build_object(
      'company_name', prof.company_name,
      'logo_url', prof.logo_url,
      'seller_name', prof.seller_name,
      'seller_phone', prof.seller_phone,
      'seller_email', prof.seller_email,
      'website', prof.website,
      'company_email', prof.company_email
    ) end,
    'company', jsonb_build_object(
      'name', coalesce(prof.company_name, 'Empresa de Energia Solar'),
      'logo_url', coalesce(prof.logo_url, ''),
      'email', coalesce(prof.company_email, ''),
      'website', coalesce(prof.website, '')
    ),
    'solar', case when solar.proposal_id is null then null else jsonb_build_object(
      'installed_power_kwp', solar.installed_power_kwp,
      'estimated_monthly_generation_kwh', solar.estimated_monthly_generation_kwh,
      'monthly_savings', solar.monthly_savings,
      'annual_savings', solar.annual_savings,
      'payback_years', solar.payback_years,
      'payback_months', solar.payback_months,
      'payback_formatted', solar.payback_formatted
    ) end,
    'solar_kit_snapshot', case
      when p.solar_kit_snapshot is null then null
      else jsonb_build_object(
        'name', p.solar_kit_snapshot -> 'name',
        'kit_power_kwp', p.solar_kit_snapshot -> 'kit_power_kwp',
        'module_quantity', p.solar_kit_snapshot -> 'module_quantity',
        'module_power_w', p.solar_kit_snapshot -> 'module_power_w',
        'inverter_power_kw', p.solar_kit_snapshot -> 'inverter_power_kw',
        'supplier', p.solar_kit_snapshot -> 'supplier',
        'system_type', p.solar_kit_snapshot -> 'system_type',
        'battery_capacity_kwh', p.solar_kit_snapshot -> 'battery_capacity_kwh'
      )
    end
  )
  into v_payload
  from public.proposals p
  left join public.clients c on c.id = p.client_id
  left join public.profiles prof on prof.id = p.user_id
  left join lateral (
    select s.*
    from public.solar_system_calculations s
    where s.proposal_id = p.id
    order by s.created_at desc
    limit 1
  ) solar on true
  where p.id = v_proposal_id;

  return v_payload;
end;
$$;

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
set search_path = public, pg_temp
as $$
declare
  v_proposal_id uuid;
  v_accepted_at timestamptz;
  v_rejected_at timestamptz;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'Ação pública inválida.';
  end if;

  update public.proposals
  set
    status = p_status,
    accepted_at = case when p_status = 'approved' then now() else accepted_at end,
    rejected_at = case when p_status = 'rejected' then now() else rejected_at end,
    rejection_reason = case
      when p_status = 'rejected' then nullif(left(trim(coalesce(p_reason, '')), 1000), '')
      else null
    end,
    client_ip = nullif(left(coalesce(p_ip, ''), 128), ''),
    client_user_agent = nullif(left(coalesce(p_user_agent, ''), 512), '')
  where public_token = trim(p_token)
    and public_token_revoked_at is null
    and (public_token_expires_at is null or public_token_expires_at > now())
    and status in ('draft', 'pending', 'sent', 'viewed')
  returning id, accepted_at, rejected_at
    into v_proposal_id, v_accepted_at, v_rejected_at;

  if v_proposal_id is null then
    raise exception 'Proposta não encontrada ou não disponível para avaliação.';
  end if;

  insert into public.proposal_events (
    proposal_id,
    user_id,
    event_type,
    description,
    metadata
  ) values (
    v_proposal_id,
    null,
    case when p_status = 'approved' then 'accepted' else 'rejected' end,
    case when p_status = 'approved' then 'Cliente aprovou a proposta' else 'Cliente recusou a proposta' end,
    case
      when p_status = 'rejected' and nullif(trim(coalesce(p_reason, '')), '') is not null
        then jsonb_build_object('reason', left(trim(p_reason), 1000), 'source', 'public_rpc')
      else jsonb_build_object('source', 'public_rpc')
    end
  );

  return jsonb_build_object(
    'status', p_status,
    'accepted_at', v_accepted_at,
    'rejected_at', v_rejected_at
  );
end;
$$;

-- RPCs públicas legadas recebem a mesma proteção para não criarem um caminho alternativo.
create or replace function public.mark_public_proposal_viewed(token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_proposal_id uuid;
begin
  select id into target_proposal_id
  from public.proposals
  where public_token = trim(token)
    and public_token_revoked_at is null
    and (public_token_expires_at is null or public_token_expires_at > now())
    and status in ('pending', 'approved', 'rejected');

  if target_proposal_id is not null then
    update public.proposals
    set public_viewed_at = coalesce(public_viewed_at, now())
    where id = target_proposal_id;

    insert into public.proposal_events (
      proposal_id,
      user_id,
      event_type,
      description
    ) values (
      target_proposal_id,
      null,
      'public_viewed',
      'Cliente visualizou a proposta pelo link público.'
    );
  end if;
end;
$$;

create or replace function public.accept_public_proposal(token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_proposal_id uuid;
begin
  select id into target_proposal_id
  from public.proposals
  where public_token = trim(token)
    and public_token_revoked_at is null
    and (public_token_expires_at is null or public_token_expires_at > now())
    and status = 'pending';

  if target_proposal_id is null then
    raise exception 'Proposta não encontrada ou não está pendente.';
  end if;

  update public.proposals
  set
    status = 'approved',
    accepted_at = now(),
    rejected_at = null,
    rejection_reason = null
  where id = target_proposal_id;

  insert into public.proposal_events (
    proposal_id,
    user_id,
    event_type,
    description
  ) values (
    target_proposal_id,
    null,
    'accepted',
    'Cliente aceitou a proposta pelo link público.'
  );
end;
$$;

create or replace function public.reject_public_proposal(token text, reason text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_proposal_id uuid;
begin
  select id into target_proposal_id
  from public.proposals
  where public_token = trim(token)
    and public_token_revoked_at is null
    and (public_token_expires_at is null or public_token_expires_at > now())
    and status = 'pending';

  if target_proposal_id is null then
    raise exception 'Proposta não encontrada ou não está pendente.';
  end if;

  update public.proposals
  set
    status = 'rejected',
    rejected_at = now(),
    rejection_reason = reason
  where id = target_proposal_id;

  insert into public.proposal_events (
    proposal_id,
    user_id,
    event_type,
    description,
    metadata
  ) values (
    target_proposal_id,
    null,
    'rejected',
    'Cliente recusou a proposta pelo link público.',
    jsonb_build_object('reason', reason)
  );
end;
$$;

-- Mantém as RPCs públicas acessíveis sem login, mas somente para tokens ativos.
grant execute on function public.get_public_proposal(text) to anon, authenticated, service_role;
grant execute on function public.update_public_proposal_status(text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.mark_public_proposal_viewed(text) to anon, authenticated, service_role;
grant execute on function public.accept_public_proposal(text) to anon, authenticated, service_role;
grant execute on function public.reject_public_proposal(text, text) to anon, authenticated, service_role;
