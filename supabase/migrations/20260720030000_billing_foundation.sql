-- =========================================================
-- Fundação de cobrança e controle de uso
--
-- Cria o catálogo comercial, o estado atual da assinatura,
-- a trilha de eventos e os contadores de uso por conta.
-- Nenhuma escrita é permitida diretamente pelo frontend.
-- =========================================================

begin;

create table if not exists public.billing_plans (
  code text primary key,
  display_name text not null,
  currency text not null default 'BRL',
  monthly_price_cents bigint not null default 0,
  annual_price_cents bigint not null default 0,
  proposals_per_month integer not null,
  users_limit integer not null,
  storage_bytes_limit bigint not null,
  is_public boolean not null default true,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_plans_code_format check (code ~ '^[a-z][a-z0-9_-]{1,31}$'),
  constraint billing_plans_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint billing_plans_monthly_price_nonnegative check (monthly_price_cents >= 0),
  constraint billing_plans_annual_price_nonnegative check (annual_price_cents >= 0),
  constraint billing_plans_proposals_positive check (proposals_per_month > 0),
  constraint billing_plans_users_positive check (users_limit > 0),
  constraint billing_plans_storage_positive check (storage_bytes_limit > 0),
  constraint billing_plans_metadata_object check (jsonb_typeof(metadata) = 'object')
);

insert into public.billing_plans (
  code,
  display_name,
  currency,
  monthly_price_cents,
  annual_price_cents,
  proposals_per_month,
  users_limit,
  storage_bytes_limit,
  is_public,
  is_active
) values
  ('free', 'Gratuito', 'BRL', 0, 0, 5, 1, 262144000, true, true),
  ('pro', 'Pro', 'BRL', 10000, 100000, 100, 5, 10737418240, true, true)
on conflict (code) do update
set display_name = excluded.display_name,
    currency = excluded.currency,
    monthly_price_cents = excluded.monthly_price_cents,
    annual_price_cents = excluded.annual_price_cents,
    proposals_per_month = excluded.proposals_per_month,
    users_limit = excluded.users_limit,
    storage_bytes_limit = excluded.storage_bytes_limit,
    is_public = excluded.is_public,
    is_active = excluded.is_active,
    updated_at = now();

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references auth.users(id) on delete cascade,
  plan_code text not null default 'free' references public.billing_plans(code),
  billing_interval text not null default 'free',
  status text not null default 'free',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  grace_period_ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_interval_valid
    check (billing_interval in ('free', 'month', 'year')),
  constraint subscriptions_status_valid
    check (status in ('free', 'incomplete', 'trialing', 'active', 'past_due', 'unpaid', 'canceled')),
  constraint subscriptions_plan_state_consistent
    check (
      (plan_code = 'free' and billing_interval = 'free' and status = 'free')
      or
      (plan_code <> 'free' and billing_interval in ('month', 'year') and status <> 'free')
    ),
  constraint subscriptions_period_valid
    check (
      current_period_start is null
      or current_period_end is null
      or current_period_end > current_period_start
    ),
  constraint subscriptions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists subscriptions_provider_customer_uidx
  on public.subscriptions (provider, provider_customer_id)
  where provider is not null and provider_customer_id is not null;

create unique index if not exists subscriptions_provider_subscription_uidx
  on public.subscriptions (provider, provider_subscription_id)
  where provider is not null and provider_subscription_id is not null;

create index if not exists subscriptions_plan_status_idx
  on public.subscriptions (plan_code, status);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  event_type text not null,
  source text not null,
  provider text,
  provider_event_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint billing_events_type_format check (event_type ~ '^[a-z][a-z0-9_.-]{2,79}$'),
  constraint billing_events_source_valid check (source in ('system', 'provider', 'admin', 'user')),
  constraint billing_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists billing_events_provider_event_uidx
  on public.billing_events (provider, provider_event_id)
  where provider is not null and provider_event_id is not null;

create index if not exists billing_events_account_created_idx
  on public.billing_events (account_id, created_at desc);

create table if not exists public.account_usage (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null default 'free' references public.billing_plans(code),
  period_start date not null,
  period_end date not null,
  timezone text not null default 'America/Sao_Paulo',
  proposals_created integer not null default 0,
  storage_bytes bigint not null default 0,
  users_count integer not null default 1,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_usage_period_valid check (period_end > period_start),
  constraint account_usage_proposals_nonnegative check (proposals_created >= 0),
  constraint account_usage_storage_nonnegative check (storage_bytes >= 0),
  constraint account_usage_users_nonnegative check (users_count >= 0),
  constraint account_usage_version_positive check (version > 0),
  unique (account_id, period_start)
);

create index if not exists account_usage_account_period_idx
  on public.account_usage (account_id, period_start desc);

create or replace function public.set_billing_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_billing_updated_at()
  from public, anon, authenticated, service_role;

drop trigger if exists billing_plans_set_updated_at on public.billing_plans;
create trigger billing_plans_set_updated_at
before update on public.billing_plans
for each row execute function public.set_billing_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_billing_updated_at();

drop trigger if exists account_usage_set_updated_at on public.account_usage;
create trigger account_usage_set_updated_at
before update on public.account_usage
for each row execute function public.set_billing_updated_at();

create or replace function public.initialize_billing_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_subscription_id uuid;
  v_created boolean := false;
  v_period_start date;
  v_period_end date;
begin
  if p_account_id is null or not exists (select 1 from auth.users where id = p_account_id) then
    raise exception 'billing_account_user_not_found' using errcode = '23503';
  end if;

  insert into public.subscriptions (
    account_id,
    plan_code,
    billing_interval,
    status
  ) values (
    p_account_id,
    'free',
    'free',
    'free'
  )
  on conflict (account_id) do nothing
  returning id into v_subscription_id;

  if v_subscription_id is not null then
    v_created := true;
  else
    select id into v_subscription_id
    from public.subscriptions
    where account_id = p_account_id;
  end if;

  v_period_start := date_trunc('month', timezone('America/Sao_Paulo', now()))::date;
  v_period_end := (v_period_start + interval '1 month')::date;

  insert into public.account_usage (
    account_id,
    plan_code,
    period_start,
    period_end,
    timezone,
    proposals_created,
    storage_bytes,
    users_count
  ) values (
    p_account_id,
    'free',
    v_period_start,
    v_period_end,
    'America/Sao_Paulo',
    0,
    0,
    1
  )
  on conflict (account_id, period_start) do nothing;

  if v_created then
    insert into public.billing_events (
      account_id,
      subscription_id,
      event_type,
      source,
      metadata
    ) values (
      p_account_id,
      v_subscription_id,
      'subscription.initialized',
      'system',
      jsonb_build_object('plan_code', 'free', 'billing_interval', 'free')
    );
  end if;
end;
$$;

revoke execute on function public.initialize_billing_account(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.handle_new_billing_account()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.initialize_billing_account(new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_billing_account()
  from public, anon, authenticated, service_role;

drop trigger if exists initialize_billing_account_on_signup on auth.users;
create trigger initialize_billing_account_on_signup
after insert on auth.users
for each row execute function public.handle_new_billing_account();

do $$
declare
  existing_user record;
begin
  for existing_user in select id from auth.users loop
    perform public.initialize_billing_account(existing_user.id);
  end loop;
end;
$$;

alter table public.billing_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.account_usage enable row level security;

revoke all on table public.billing_plans
  from public, anon, authenticated, service_role;
revoke all on table public.subscriptions
  from public, anon, authenticated, service_role;
revoke all on table public.billing_events
  from public, anon, authenticated, service_role;
revoke all on table public.account_usage
  from public, anon, authenticated, service_role;

grant select on table public.billing_plans
  to anon, authenticated, service_role;
grant select, insert, update on table public.subscriptions
  to service_role;
grant select on table public.subscriptions
  to authenticated;
grant select, insert on table public.billing_events
  to service_role;
grant select on table public.billing_events
  to authenticated;
grant select, insert, update on table public.account_usage
  to service_role;
grant select on table public.account_usage
  to authenticated;

drop policy if exists "Planos públicos podem ser consultados"
  on public.billing_plans;
create policy "Planos públicos podem ser consultados"
  on public.billing_plans
  for select
  to anon, authenticated
  using (is_public and is_active);

drop policy if exists "Usuário pode consultar a própria assinatura"
  on public.subscriptions;
create policy "Usuário pode consultar a própria assinatura"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = account_id);

drop policy if exists "Usuário pode consultar os próprios eventos de cobrança"
  on public.billing_events;
create policy "Usuário pode consultar os próprios eventos de cobrança"
  on public.billing_events
  for select
  to authenticated
  using (auth.uid() = account_id);

drop policy if exists "Usuário pode consultar o próprio uso"
  on public.account_usage;
create policy "Usuário pode consultar o próprio uso"
  on public.account_usage
  for select
  to authenticated
  using (auth.uid() = account_id);

comment on table public.billing_plans is
  'Catálogo versionado de preços e limites comerciais disponíveis no SaaS.';
comment on table public.subscriptions is
  'Estado atual da assinatura de cada conta, escrito somente pelo servidor.';
comment on table public.billing_events is
  'Trilha append-only de mudanças de assinatura e eventos idempotentes do provedor.';
comment on table public.account_usage is
  'Contadores mensais e snapshots de uso empregados na autorização de recursos.';
comment on function public.initialize_billing_account(uuid) is
  'Cria de forma idempotente assinatura gratuita, período de uso e evento inicial para uma conta.';

commit;
