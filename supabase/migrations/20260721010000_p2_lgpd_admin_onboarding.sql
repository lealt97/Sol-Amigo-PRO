-- =========================================================
-- P2: lançamento controlado, LGPD, administração e onboarding
-- - documentos legais versionados e aceite comprovável
-- - papel administrativo validado exclusivamente no servidor
-- - auditoria append-only de ações administrativas
-- - feedback estruturado do beta
-- - status calculado do onboarding da primeira proposta
-- =========================================================

begin;

create table if not exists public.legal_document_versions (
  document_type text not null,
  version text not null,
  title text not null,
  summary text not null,
  content_markdown text not null,
  effective_at timestamptz not null,
  review_status text not null default 'draft',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (document_type, version),
  constraint legal_document_type_valid check (
    document_type in ('terms', 'privacy', 'refund')
  ),
  constraint legal_document_version_format check (
    version ~ '^[0-9]{4}-[0-9]{2}(-[a-z0-9.-]+)?$'
  ),
  constraint legal_document_review_status_valid check (
    review_status in ('draft', 'legal_review', 'approved', 'retired')
  ),
  constraint legal_document_title_length check (length(title) between 3 and 160),
  constraint legal_document_summary_length check (length(summary) between 10 and 600),
  constraint legal_document_content_length check (length(content_markdown) between 100 and 50000)
);

create unique index if not exists legal_document_one_active_per_type_uidx
  on public.legal_document_versions (document_type)
  where is_active;

alter table public.legal_document_versions enable row level security;

revoke all on table public.legal_document_versions
  from public, anon, authenticated, service_role;
grant select on table public.legal_document_versions to anon, authenticated, service_role;
grant insert, update, delete on table public.legal_document_versions to service_role;

create policy "Documentos legais ativos são públicos"
  on public.legal_document_versions
  for select
  to anon, authenticated
  using (is_active = true);

insert into public.legal_document_versions (
  document_type,
  version,
  title,
  summary,
  content_markdown,
  effective_at,
  review_status,
  is_active
) values
  (
    'terms',
    '2026-07-draft',
    'Termos de Uso',
    'Regras operacionais para uso responsável do SolAmigo Propostas FV durante o beta controlado.',
    E'# Termos de Uso\n\nEsta é uma minuta operacional para o beta controlado e depende de revisão jurídica antes do lançamento comercial aberto. O usuário é responsável pela veracidade dos dados técnicos, comerciais e cadastrais inseridos. O SolAmigo auxilia na elaboração de propostas, mas não substitui projeto executivo, vistoria, responsabilidade técnica, normas da distribuidora, legislação tributária ou validação profissional. O acesso pode ser limitado por plano, uso indevido, risco de segurança ou descumprimento destas regras. Dados e arquivos permanecem pertencentes à conta, observadas as políticas de retenção, segurança e exclusão. Preços, funcionalidades e limites podem mudar mediante comunicação e respeito ao período contratado.',
    now(),
    'draft',
    true
  ),
  (
    'privacy',
    '2026-07-draft',
    'Política de Privacidade',
    'Descrição preliminar das finalidades, bases, controles e direitos relacionados aos dados pessoais.',
    E'# Política de Privacidade\n\nEsta é uma minuta operacional para o beta controlado e depende de revisão jurídica antes do lançamento comercial aberto. O SolAmigo trata dados de conta, empresa, clientes, propostas, arquivos, segurança, cobrança e uso para fornecer o serviço, proteger contas, cumprir obrigações e melhorar o produto. O acesso é isolado por conta e operações sensíveis usam autenticação reforçada. Dados não são vendidos. Provedores de infraestrutura e pagamento recebem somente o necessário para executar suas funções. O titular pode solicitar acesso, correção, exportação e exclusão pelos recursos da conta e pelo canal de atendimento definido para o beta. Logs de segurança e registros obrigatórios podem ser preservados pelo período necessário à prevenção de fraude, auditoria e cumprimento legal.',
    now(),
    'draft',
    true
  ),
  (
    'refund',
    '2026-07-draft',
    'Política de Cancelamento e Reembolso',
    'Condições preliminares para cancelamento, renovação, cobrança e análise de reembolso.',
    E'# Política de Cancelamento e Reembolso\n\nEsta é uma minuta operacional para o beta controlado e depende de revisão jurídica antes do lançamento comercial aberto. O plano Gratuito não possui cobrança recorrente. Planos pagos podem ser cancelados pelo canal ou portal disponibilizado, sem apagar automaticamente os dados da conta. O acesso pago segue até o término do período quitado, salvo fraude, chargeback ou violação grave. Reembolsos, arrependimento, cobranças duplicadas e falhas do serviço serão analisados conforme a legislação aplicável, o meio de pagamento e as evidências do caso. O início de um checkout não comprova pagamento; a assinatura muda somente após confirmação autenticada do provedor.',
    now(),
    'draft',
    true
  )
on conflict (document_type, version) do update
set title = excluded.title,
    summary = excluded.summary,
    content_markdown = excluded.content_markdown,
    effective_at = excluded.effective_at,
    review_status = excluded.review_status,
    is_active = excluded.is_active;

create table if not exists public.account_legal_acceptances (
  account_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  document_version text not null,
  accepted_at timestamptz not null default now(),
  source text not null,
  acceptance_metadata jsonb not null default '{}'::jsonb,
  primary key (account_id, document_type, document_version),
  constraint account_legal_document_type_valid check (
    document_type in ('terms', 'privacy', 'refund')
  ),
  constraint account_legal_source_valid check (
    source in ('signup', 'account', 'admin_migration')
  ),
  constraint account_legal_metadata_object check (
    jsonb_typeof(acceptance_metadata) = 'object'
  ),
  foreign key (document_type, document_version)
    references public.legal_document_versions(document_type, version)
    on update cascade on delete restrict
);

create index if not exists account_legal_acceptances_account_idx
  on public.account_legal_acceptances (account_id, accepted_at desc);

alter table public.account_legal_acceptances enable row level security;

revoke all on table public.account_legal_acceptances
  from public, anon, authenticated, service_role;
grant select on table public.account_legal_acceptances to authenticated, service_role;
grant insert on table public.account_legal_acceptances to service_role;

create policy "Conta consulta os próprios aceites legais"
  on public.account_legal_acceptances
  for select
  to authenticated
  using (auth.uid() = account_id);

create or replace function public.record_signup_legal_acceptances()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_item jsonb;
  v_type text;
  v_version text;
begin
  if jsonb_typeof(new.raw_user_meta_data -> 'legal_acceptances') <> 'array' then
    return new;
  end if;

  for v_item in
    select value from jsonb_array_elements(new.raw_user_meta_data -> 'legal_acceptances')
  loop
    v_type := nullif(trim(v_item ->> 'document_type'), '');
    v_version := nullif(trim(v_item ->> 'version'), '');

    if exists (
      select 1
      from public.legal_document_versions document
      where document.document_type = v_type
        and document.version = v_version
        and document.is_active = true
    ) then
      insert into public.account_legal_acceptances (
        account_id,
        document_type,
        document_version,
        source,
        acceptance_metadata
      ) values (
        new.id,
        v_type,
        v_version,
        'signup',
        jsonb_build_object('channel', 'web_registration')
      )
      on conflict do nothing;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.record_signup_legal_acceptances()
  from public, anon, authenticated, service_role;

drop trigger if exists record_signup_legal_acceptances_after_insert on auth.users;
create trigger record_signup_legal_acceptances_after_insert
after insert on auth.users
for each row execute function public.record_signup_legal_acceptances();

create or replace function public.accept_current_legal_documents()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  insert into public.account_legal_acceptances (
    account_id,
    document_type,
    document_version,
    source,
    acceptance_metadata
  )
  select
    v_user_id,
    document.document_type,
    document.version,
    'account',
    jsonb_build_object('channel', 'account_settings')
  from public.legal_document_versions document
  where document.is_active = true
  on conflict do nothing;

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'accepted', true,
    'new_acceptances', v_count,
    'accepted_at', now()
  );
end;
$$;

revoke all on function public.accept_current_legal_documents()
  from public, anon;
grant execute on function public.accept_current_legal_documents()
  to authenticated;

create or replace function public.get_my_legal_status()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with active_documents as (
    select document_type, version, title, review_status
    from public.legal_document_versions
    where is_active = true
  )
  select jsonb_build_object(
    'complete', not exists (
      select 1
      from active_documents document
      where not exists (
        select 1
        from public.account_legal_acceptances acceptance
        where acceptance.account_id = auth.uid()
          and acceptance.document_type = document.document_type
          and acceptance.document_version = document.version
      )
    ),
    'documents', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'document_type', document.document_type,
          'version', document.version,
          'title', document.title,
          'review_status', document.review_status,
          'accepted', exists (
            select 1
            from public.account_legal_acceptances acceptance
            where acceptance.account_id = auth.uid()
              and acceptance.document_type = document.document_type
              and acceptance.document_version = document.version
          )
        ) order by document.document_type
      ),
      '[]'::jsonb
    )
  )
  from active_documents document;
$$;

revoke all on function public.get_my_legal_status()
  from public, anon;
grant execute on function public.get_my_legal_status()
  to authenticated;

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_admin_role_valid check (
    role in ('support', 'operations', 'super_admin')
  )
);

alter table public.platform_admins enable row level security;

revoke all on table public.platform_admins
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.platform_admins
  to service_role;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text not null,
  action text not null,
  target_account_id uuid references auth.users(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_audit_actor_role_valid check (
    actor_role in ('support', 'operations', 'super_admin', 'system')
  ),
  constraint admin_audit_action_format check (
    action ~ '^[a-z0-9_.-]{3,120}$'
  ),
  constraint admin_audit_reason_length check (
    reason is null or length(reason) between 5 and 1000
  ),
  constraint admin_audit_metadata_object check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_target_idx
  on public.admin_audit_logs (target_account_id, created_at desc)
  where target_account_id is not null;

alter table public.admin_audit_logs enable row level security;

revoke all on table public.admin_audit_logs
  from public, anon, authenticated, service_role;
grant select, insert on table public.admin_audit_logs to service_role;

create or replace function public.prevent_admin_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'admin_audit_logs_append_only' using errcode = '42501';
end;
$$;

revoke all on function public.prevent_admin_audit_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists admin_audit_logs_append_only on public.admin_audit_logs;
create trigger admin_audit_logs_append_only
before update or delete on public.admin_audit_logs
for each row execute function public.prevent_admin_audit_mutation();

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  score integer,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint beta_feedback_category_valid check (
    category in ('onboarding', 'proposal', 'pdf', 'billing', 'usability', 'bug', 'other')
  ),
  constraint beta_feedback_score_valid check (
    score is null or score between 0 and 10
  ),
  constraint beta_feedback_message_length check (
    length(message) between 10 and 5000
  ),
  constraint beta_feedback_context_object check (
    jsonb_typeof(context) = 'object'
  )
);

create index if not exists beta_feedback_account_created_idx
  on public.beta_feedback (account_id, created_at desc);
create index if not exists beta_feedback_category_created_idx
  on public.beta_feedback (category, created_at desc);

alter table public.beta_feedback enable row level security;

revoke all on table public.beta_feedback
  from public, anon, authenticated, service_role;
grant select, insert on table public.beta_feedback to authenticated, service_role;

create policy "Conta consulta o próprio feedback beta"
  on public.beta_feedback
  for select
  to authenticated
  using (auth.uid() = account_id);

create policy "Conta registra o próprio feedback beta"
  on public.beta_feedback
  for insert
  to authenticated
  with check (auth.uid() = account_id);

create or replace function public.get_my_onboarding_status()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with status as (
    select
      exists (
        select 1 from public.profiles profile
        where profile.id = auth.uid()
          and nullif(trim(profile.company_name), '') is not null
          and nullif(trim(coalesce(profile.company_email, profile.email, '')), '') is not null
      ) as company_complete,
      exists (
        select 1 from public.profiles profile
        where profile.id = auth.uid()
          and nullif(trim(coalesce(profile.logo_url, '')), '') is not null
      ) as logo_complete,
      exists (
        select 1 from public.solar_kits kit
        where kit.user_id = auth.uid()
      ) as kit_complete,
      exists (
        select 1 from public.clients client
        where client.user_id = auth.uid()
      ) as client_complete,
      exists (
        select 1 from public.proposals proposal
        where proposal.user_id = auth.uid()
      ) as proposal_complete
  )
  select jsonb_build_object(
    'company_complete', company_complete,
    'logo_complete', logo_complete,
    'kit_complete', kit_complete,
    'client_complete', client_complete,
    'proposal_complete', proposal_complete,
    'completed_steps',
      company_complete::integer
      + logo_complete::integer
      + kit_complete::integer
      + client_complete::integer
      + proposal_complete::integer,
    'total_steps', 5,
    'complete',
      company_complete
      and logo_complete
      and kit_complete
      and client_complete
      and proposal_complete
  )
  from status;
$$;

revoke all on function public.get_my_onboarding_status()
  from public, anon;
grant execute on function public.get_my_onboarding_status()
  to authenticated;

-- A exclusão completa passa pela Edge Function, que remove primeiro os bytes
-- do Storage. A RPC direta permanece disponível somente para service_role.
revoke execute on function public.delete_user_account()
  from authenticated;
grant execute on function public.delete_user_account()
  to service_role;

comment on table public.legal_document_versions is
  'Versões imutáveis de documentos legais. Minutas draft não representam aprovação jurídica.';
comment on table public.account_legal_acceptances is
  'Aceites legais versionados por conta, sem IP, token, cookie ou dado de cartão.';
comment on table public.platform_admins is
  'Papel administrativo explícito, criado somente por operação server-side controlada.';
comment on table public.admin_audit_logs is
  'Trilha append-only de toda ação administrativa relevante.';
comment on table public.beta_feedback is
  'Feedback estruturado do beta, pertencente à conta e consultável pela administração.';

notify pgrst, 'reload schema';

commit;
