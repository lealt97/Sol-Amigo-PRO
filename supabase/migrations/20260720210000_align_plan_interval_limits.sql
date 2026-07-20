-- =========================================================
-- Alinha as cotas comerciais exibidas e aplicadas no servidor
-- - Gratuito: 5 propostas/mês
-- - Pro mensal: 30 propostas/mês
-- - Pro anual: 40 propostas/mês
-- =========================================================

begin;

alter table public.billing_plans
  add column if not exists annual_proposals_per_month integer;

update public.billing_plans
set proposals_per_month = 5,
    annual_proposals_per_month = 5,
    updated_at = now()
where code = 'free';

update public.billing_plans
set proposals_per_month = 30,
    annual_proposals_per_month = 40,
    updated_at = now()
where code = 'pro';

alter table public.billing_plans
  alter column annual_proposals_per_month set not null;

alter table public.billing_plans
  drop constraint if exists billing_plans_annual_proposals_positive;

alter table public.billing_plans
  add constraint billing_plans_annual_proposals_positive
  check (annual_proposals_per_month > 0)
  not valid;

alter table public.billing_plans
  validate constraint billing_plans_annual_proposals_positive;

comment on column public.billing_plans.proposals_per_month is
  'Cota mensal padrão. Para o produto Pro corresponde ao intervalo month.';

comment on column public.billing_plans.annual_proposals_per_month is
  'Cota mensal concedida quando a assinatura usa o intervalo year.';

alter table public.account_usage
  add column if not exists billing_interval text;

update public.account_usage usage
set billing_interval = case
  when usage.plan_code = 'free' then 'free'
  when subscription.billing_interval in ('month', 'year') then subscription.billing_interval
  else 'month'
end
from public.subscriptions subscription
where subscription.account_id = usage.account_id
  and usage.billing_interval is null;

update public.account_usage
set billing_interval = case
  when plan_code = 'free' then 'free'
  else 'month'
end
where billing_interval is null;

alter table public.account_usage
  alter column billing_interval set default 'free',
  alter column billing_interval set not null;

alter table public.account_usage
  drop constraint if exists account_usage_billing_interval_valid;

alter table public.account_usage
  add constraint account_usage_billing_interval_valid
  check (billing_interval in ('free', 'month', 'year'))
  not valid;

alter table public.account_usage
  validate constraint account_usage_billing_interval_valid;

alter table public.account_usage
  drop constraint if exists account_usage_plan_interval_consistent;

alter table public.account_usage
  add constraint account_usage_plan_interval_consistent
  check (
    (plan_code = 'free' and billing_interval = 'free')
    or
    (plan_code <> 'free' and billing_interval in ('month', 'year'))
  )
  not valid;

alter table public.account_usage
  validate constraint account_usage_plan_interval_consistent;

create or replace function public.resolve_plan_proposal_limit(
  p_plan_code text,
  p_billing_interval text
)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when plan.code = 'free' and p_billing_interval = 'free'
      then plan.proposals_per_month
    when plan.code <> 'free' and p_billing_interval = 'month'
      then plan.proposals_per_month
    when plan.code <> 'free' and p_billing_interval = 'year'
      then plan.annual_proposals_per_month
    else null
  end
  from public.billing_plans plan
  where plan.code = p_plan_code
    and plan.is_active;
$$;

revoke all on function public.resolve_plan_proposal_limit(text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_plan_proposal_limit(text, text)
  to service_role;

comment on function public.resolve_plan_proposal_limit(text, text) is
  'Resolve no servidor a cota de propostas usando produto e intervalo da assinatura.';

notify pgrst, 'reload schema';

commit;
