-- =========================================================
-- P1: cota mensal de propostas aplicada no servidor
-- - criação e duplicação reservam uma unidade atomicamente
-- - edição e exclusão não alteram o contador
-- - falha no insert desfaz também a reserva
-- =========================================================

begin;

create or replace function public.reserve_proposal_quota()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_subscription public.subscriptions%rowtype;
  v_plan_code text;
  v_billing_interval text;
  v_period_start date;
  v_period_end date;
  v_limit integer;
  v_used integer;
begin
  if new.user_id is null then
    raise exception 'proposal_account_required' using errcode = '23502';
  end if;

  if auth.uid() is not null and auth.uid() <> new.user_id then
    raise exception 'proposal_account_mismatch' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.subscriptions subscription
    where subscription.account_id = new.user_id
  ) then
    perform public.initialize_billing_account(new.user_id);
  end if;

  select subscription.*
    into v_subscription
  from public.subscriptions subscription
  where subscription.account_id = new.user_id
  for update;

  if not found then
    raise exception 'proposal_subscription_not_found' using errcode = 'P0002';
  end if;

  if v_subscription.plan_code <> 'free'
     and (
       v_subscription.status in ('active', 'trialing')
       or (
         v_subscription.status = 'past_due'
         and v_subscription.grace_period_ends_at is not null
         and v_subscription.grace_period_ends_at > now()
       )
     ) then
    v_plan_code := v_subscription.plan_code;
    v_billing_interval := v_subscription.billing_interval;
  else
    v_plan_code := 'free';
    v_billing_interval := 'free';
  end if;

  v_limit := public.resolve_plan_proposal_limit(v_plan_code, v_billing_interval);
  if v_limit is null or v_limit <= 0 then
    raise exception 'proposal_plan_limit_unavailable' using errcode = 'P0001';
  end if;

  v_period_start := date_trunc('month', timezone('America/Sao_Paulo', now()))::date;
  v_period_end := (v_period_start + interval '1 month')::date;

  insert into public.account_usage (
    account_id,
    plan_code,
    billing_interval,
    period_start,
    period_end,
    timezone,
    proposals_created,
    storage_bytes,
    users_count
  ) values (
    new.user_id,
    v_plan_code,
    v_billing_interval,
    v_period_start,
    v_period_end,
    'America/Sao_Paulo',
    0,
    0,
    1
  )
  on conflict (account_id, period_start) do nothing;

  select usage.proposals_created
    into v_used
  from public.account_usage usage
  where usage.account_id = new.user_id
    and usage.period_start = v_period_start
  for update;

  if not found then
    raise exception 'proposal_usage_period_not_found' using errcode = 'P0002';
  end if;

  if v_used >= v_limit then
    raise exception 'Limite mensal de propostas atingido (% de %).', v_used, v_limit
      using errcode = 'P0001',
            hint = 'Aguarde o próximo período ou altere seu plano.';
  end if;

  update public.account_usage usage
  set plan_code = v_plan_code,
      billing_interval = v_billing_interval,
      period_end = v_period_end,
      proposals_created = usage.proposals_created + 1,
      version = usage.version + 1,
      updated_at = now()
  where usage.account_id = new.user_id
    and usage.period_start = v_period_start;

  return new;
end;
$$;

revoke all on function public.reserve_proposal_quota()
  from public, anon, authenticated, service_role;

drop trigger if exists reserve_proposal_quota_before_insert on public.proposals;
create trigger reserve_proposal_quota_before_insert
before insert on public.proposals
for each row execute function public.reserve_proposal_quota();

-- Evita que a ativação do bloqueio reduza o contador já observado no mês atual.
with counted as (
  select
    proposal.user_id as account_id,
    date_trunc('month', timezone('America/Sao_Paulo', proposal.created_at))::date as period_start,
    count(*)::integer as proposals_created
  from public.proposals proposal
  group by proposal.user_id,
           date_trunc('month', timezone('America/Sao_Paulo', proposal.created_at))::date
)
update public.account_usage usage
set proposals_created = greatest(usage.proposals_created, counted.proposals_created),
    version = usage.version + 1,
    updated_at = now()
from counted
where usage.account_id = counted.account_id
  and usage.period_start = counted.period_start;

create or replace function public.get_my_proposal_quota()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_subscription public.subscriptions%rowtype;
  v_plan_code text;
  v_billing_interval text;
  v_period_start date;
  v_period_end date;
  v_limit integer;
  v_used integer := 0;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  select subscription.*
    into v_subscription
  from public.subscriptions subscription
  where subscription.account_id = v_user_id;

  if not found then
    v_plan_code := 'free';
    v_billing_interval := 'free';
  elsif v_subscription.plan_code <> 'free'
        and (
          v_subscription.status in ('active', 'trialing')
          or (
            v_subscription.status = 'past_due'
            and v_subscription.grace_period_ends_at is not null
            and v_subscription.grace_period_ends_at > now()
          )
        ) then
    v_plan_code := v_subscription.plan_code;
    v_billing_interval := v_subscription.billing_interval;
  else
    v_plan_code := 'free';
    v_billing_interval := 'free';
  end if;

  v_period_start := date_trunc('month', timezone('America/Sao_Paulo', now()))::date;
  v_period_end := (v_period_start + interval '1 month')::date;
  v_limit := public.resolve_plan_proposal_limit(v_plan_code, v_billing_interval);

  select usage.proposals_created
    into v_used
  from public.account_usage usage
  where usage.account_id = v_user_id
    and usage.period_start = v_period_start;

  return jsonb_build_object(
    'plan_code', v_plan_code,
    'billing_interval', v_billing_interval,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'used', coalesce(v_used, 0),
    'limit', v_limit,
    'remaining', greatest(coalesce(v_limit, 0) - coalesce(v_used, 0), 0),
    'warning', coalesce(v_used, 0) * 100 >= coalesce(v_limit, 1) * 80
  );
end;
$$;

revoke all on function public.get_my_proposal_quota()
  from public, anon;
grant execute on function public.get_my_proposal_quota()
  to authenticated;

comment on function public.reserve_proposal_quota() is
  'Reserva atomicamente a cota mensal antes de criar uma proposta; a transação desfaz a reserva se a criação falhar.';

comment on function public.get_my_proposal_quota() is
  'Retorna ao usuário autenticado somente a própria cota efetiva e o uso do período atual.';

notify pgrst, 'reload schema';

commit;
