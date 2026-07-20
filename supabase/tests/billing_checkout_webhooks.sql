\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'Billing checkout test failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  'b3000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'billing-webhook@solamigo.test',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Billing Webhook"}'::jsonb,
  now(),
  now()
);

insert into public.billing_checkout_sessions (
  account_id,
  provider,
  billing_interval,
  idempotency_key,
  provider_session_id,
  checkout_url,
  expires_at
) values (
  'b3000000-0000-4000-8000-000000000001',
  'stripe',
  'month',
  'checkout:b3000000:stripe:month:0001',
  'cs_test_solamigo',
  'https://checkout.stripe.test/session',
  now() + interval '30 minutes'
);

select public.apply_billing_provider_event(
  'stripe',
  'evt_active_1',
  'customer.subscription.created',
  'b3000000-0000-4000-8000-000000000001',
  'cus_solamigo',
  'sub_solamigo',
  'month',
  'active',
  now(),
  now() + interval '1 month',
  null,
  '{"livemode":false}'::jsonb
);

select pg_temp.assert_true(
  (
    select subscription.plan_code = 'pro'
      and subscription.billing_interval = 'month'
      and subscription.status = 'active'
      and subscription.provider = 'stripe'
    from public.subscriptions subscription
    where subscription.account_id = 'b3000000-0000-4000-8000-000000000001'
  ),
  'evento ativo não sincronizou a assinatura Pro mensal'
);

select pg_temp.assert_true(
  (
    select usage.plan_code = 'pro' and usage.billing_interval = 'month'
    from public.account_usage usage
    where usage.account_id = 'b3000000-0000-4000-8000-000000000001'
      and usage.period_start = date_trunc('month', timezone('America/Sao_Paulo', now()))::date
  ),
  'evento ativo não liberou a cota Pro'
);

select public.apply_billing_provider_event(
  'stripe',
  'evt_checkout_1',
  'checkout.session.completed',
  'b3000000-0000-4000-8000-000000000001',
  'cus_solamigo',
  'sub_solamigo',
  'month',
  null,
  null,
  null,
  null,
  '{}'::jsonb
);

select pg_temp.assert_true(
  (
    select checkout_session.status = 'completed' and checkout_session.completed_at is not null
    from public.billing_checkout_sessions checkout_session
    where checkout_session.provider_session_id = 'cs_test_solamigo'
  ),
  'checkout concluído não foi marcado como completo'
);

select public.apply_billing_provider_event(
  'stripe',
  'evt_active_1',
  'customer.subscription.created',
  'b3000000-0000-4000-8000-000000000001',
  'cus_solamigo',
  'sub_solamigo',
  'month',
  'active',
  now(),
  now() + interval '1 month',
  null,
  '{}'::jsonb
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.billing_events event
    where event.provider = 'stripe'
      and event.provider_event_id = 'evt_active_1'
  ),
  'evento duplicado foi persistido mais de uma vez'
);

select public.apply_billing_provider_event(
  'stripe',
  'evt_past_due_1',
  'invoice.payment_failed',
  'b3000000-0000-4000-8000-000000000001',
  'cus_solamigo',
  'sub_solamigo',
  'month',
  'past_due',
  null,
  null,
  now() + interval '3 days',
  '{}'::jsonb
);

select pg_temp.assert_true(
  (
    select usage.plan_code = 'pro'
    from public.account_usage usage
    where usage.account_id = 'b3000000-0000-4000-8000-000000000001'
      and usage.period_start = date_trunc('month', timezone('America/Sao_Paulo', now()))::date
  ),
  'período de tolerância removeu a cota Pro antes da hora'
);

select public.apply_billing_provider_event(
  'stripe',
  'evt_cancel_1',
  'customer.subscription.deleted',
  'b3000000-0000-4000-8000-000000000001',
  'cus_solamigo',
  'sub_solamigo',
  'month',
  'canceled',
  null,
  null,
  null,
  '{}'::jsonb
);

select pg_temp.assert_true(
  (
    select subscription.plan_code = 'pro'
      and subscription.billing_interval = 'month'
      and subscription.status = 'canceled'
    from public.subscriptions subscription
    where subscription.account_id = 'b3000000-0000-4000-8000-000000000001'
  ),
  'cancelamento não preservou o histórico consistente da assinatura'
);

select pg_temp.assert_true(
  (
    select usage.plan_code = 'free' and usage.billing_interval = 'free'
    from public.account_usage usage
    where usage.account_id = 'b3000000-0000-4000-8000-000000000001'
      and usage.period_start = date_trunc('month', timezone('America/Sao_Paulo', now()))::date
  ),
  'cancelamento não removeu a cota efetiva Pro'
);

rollback;

\echo 'Billing checkout and webhook event test passed'
