-- =========================================================
-- Fase 1 de segurança
-- - remove acesso anônimo direto às tabelas de propostas
-- - expõe somente dados comerciais por RPC
-- - torna PDFs privados e registra o caminho no Storage
-- - isola uploads por usuário
-- =========================================================

begin;

alter table public.proposals
  add column if not exists pdf_storage_path text;

create index if not exists proposals_pdf_storage_path_idx
  on public.proposals(pdf_storage_path)
  where pdf_storage_path is not null;

-- Recupera o caminho de PDFs legados que ainda possuem URL pública/assinada.
update public.proposals
set pdf_storage_path = regexp_replace(
  split_part(pdf_url, '?', 1),
  '^.*/storage/v1/object/public/proposals/',
  ''
)
where pdf_storage_path is null
  and pdf_url like '%/storage/v1/object/public/proposals/%';

update public.proposals
set pdf_storage_path = regexp_replace(
  split_part(pdf_url, '?', 1),
  '^.*/storage/v1/object/sign/proposals/',
  ''
)
where pdf_storage_path is null
  and pdf_url like '%/storage/v1/object/sign/proposals/%';

-- O bucket de propostas passa a ser privado.
insert into storage.buckets (id, name, public)
values ('proposals', 'proposals', false)
on conflict (id) do update set public = false;

-- Remove políticas anônimas perigosas criadas por versões anteriores.
drop policy if exists "Leitura anonima de proposta por token" on public.proposals;
drop policy if exists "Atualizacao anonima de proposta por token" on public.proposals;
drop policy if exists "Anonimo pode inserir eventos via link publico" on public.proposal_events;

-- Remove políticas antigas de Storage para recriá-las com isolamento por usuário.
drop policy if exists "Public read proposals PDFs" on storage.objects;
drop policy if exists "Authenticated upload proposals PDFs" on storage.objects;
drop policy if exists "Authenticated update proposals PDFs" on storage.objects;
drop policy if exists "Authenticated delete proposals PDFs" on storage.objects;
drop policy if exists "Leitura pública para proposals" on storage.objects;
drop policy if exists "Upload para proposals" on storage.objects;
drop policy if exists "Atualização para proposals" on storage.objects;
drop policy if exists "Exclusão para proposals" on storage.objects;

drop policy if exists "Public read pdf-assets" on storage.objects;
drop policy if exists "Authenticated upload pdf-assets" on storage.objects;
drop policy if exists "Authenticated update pdf-assets" on storage.objects;
drop policy if exists "Authenticated delete pdf-assets" on storage.objects;
drop policy if exists "Leitura pública para pdf-assets" on storage.objects;
drop policy if exists "Upload para pdf-assets" on storage.objects;
drop policy if exists "Atualização para pdf-assets" on storage.objects;
drop policy if exists "Exclusão para pdf-assets" on storage.objects;

drop policy if exists "Public read logos" on storage.objects;
drop policy if exists "Authenticated upload logos" on storage.objects;
drop policy if exists "Authenticated update logos" on storage.objects;
drop policy if exists "Authenticated delete logos" on storage.objects;
drop policy if exists "Public Access for logos" on storage.objects;
drop policy if exists "Users can upload logos" on storage.objects;
drop policy if exists "Users can update their logos" on storage.objects;
drop policy if exists "Users can delete their logos" on storage.objects;

-- PDFs comerciais: somente o proprietário acessa diretamente pelo SDK.
create policy "Owner read proposal PDFs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'proposals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner upload proposal PDFs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'proposals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner update proposal PDFs"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'proposals'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'proposals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner delete proposal PDFs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'proposals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Logos e imagens de capa continuam públicas para renderização, mas só o dono grava.
create policy "Public read pdf-assets"
  on storage.objects for select
  using (bucket_id = 'pdf-assets');

create policy "Owner upload pdf-assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'pdf-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner update pdf-assets"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'pdf-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'pdf-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner delete pdf-assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'pdf-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Public read logos"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "Owner upload logos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner update logos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner delete logos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =========================================================
-- RPC pública: retorna somente o necessário para a página do cliente.
-- =========================================================
drop function if exists public.get_public_proposal(text);

create function public.get_public_proposal(p_token text)
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
  where p.public_token = p_token
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

-- =========================================================
-- RPC pública: aceita/recusa sem liberar UPDATE direto na tabela.
-- =========================================================
drop function if exists public.update_public_proposal_status(text, text, text, text, text);

create function public.update_public_proposal_status(
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
  where public_token = p_token
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

revoke all on function public.get_public_proposal(text) from public;
revoke all on function public.update_public_proposal_status(text, text, text, text, text) from public;

grant execute on function public.get_public_proposal(text) to anon, authenticated;
grant execute on function public.update_public_proposal_status(text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
