\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'Billing foundation test failed: %', message;
  end if;
end;
$$;

select pg_temp.assert_true(
  to_regclass('public.billing_plans') is not null
  and to_regclass('public.subscriptions') is not null
  and to_regclass('public.billing_events') is not null
  and to_regclass('public.account_usage') is not null,
  'uma ou mais tabelas de cobrança não existem'
);

select pg_temp.assert_true(
  (select count(*) = 2 from public.billing_plans where code in ('free', 'pro')),
  'o catálogo não contém os planos free e pro'
);

select pg_temp.assert_true(
  exists (
    select 1 from public.billing_plans
    where code = 'free'
      and currency = 'BRL'
      and monthly_price_cents = 0
      and annual_price_cents = 0
      and proposals_per_month = 5
      and users_limit = 1
      and storage_bytes_limit = 262144000
  )
  and exists (
    select 1 from public.billing_plans
    where code = 'pro'
      and currency = 'BRL'
      and monthly_price_cents = 10000
      and annual_price_cents = 100000
      and proposals_per_month = 100
      and users_limit = 5
      and storage_bytes_limit = 10737418240
  ),
  'preços ou limites do catálogo estão incorretos'
);

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
) values
  (
    'b1000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'billing-owner@solamigo.test',
    crypt('TestPassword123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Billing Owner","company_name":"SolAmigo Billing"}'::jsonb,
    now(),
    now()
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'billing-other@solamigo.test',
    crypt('TestPassword123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Billing Other","company_name":"SolAmigo Other"}'::jsonb,
    now(),
    now()
  );

select pg_temp.assert_true(
  (select count(*) = 2
   from public.subscriptions
   where account_id in (
     'b1000000-0000-4000-8000-000000000001',
     'b1000000-0000-4000-8000-000000000002'
   )
     and plan_code = 'free'
     and billing_interval = 'free'
     and status = 'free'),
  'o gatilho não criou assinaturas gratuitas para as contas'
);

select pg_temp.assert_true(
  (select count(*) = 2
   from public.account_usage
   where account_id in (
     'b1000000-0000-4000-8000-000000000001',
     'b1000000-0000-4000-8000-000000000002'
   )
     and plan_code = 'free'
     and proposals_created = 0
     and storage_bytes = 0
     and users_count = 1
     and timezone = 'America/Sao_Paulo'
     and period_end > period_start),
  'o período inicial de uso não foi criado corretamente'
);

select pg_temp.assert_true(
  (select count(*) = 2
   from public.billing_events
   where account_id in (
     'b1000000-0000-4000-8000-000000000001',
     'b1000000-0000-4000-8000-000000000002'
   )
     and event_type = 'subscription.initialized'
     and source = 'system'
     and metadata ->> 'plan_code' = 'free'),
  'o evento inicial da assinatura não foi registrado'
);

select public.initialize_billing_account('b1000000-0000-4000-8000-000000000001');

select pg_temp.assert_true(
  (select count(*) = 1
   from public.subscriptions
   where account_id = 'b1000000-0000-4000-8000-000000000001')
  and
  (select count(*) = 1
   from public.billing_events
   where account_id = 'b1000000-0000-4000-8000-000000000001'
     and event_type = 'subscription.initialized'),
  'a inicialização idempotente duplicou assinatura ou evento'
);

select pg_temp.assert_true(
  has_table_privilege('anon', 'public.billing_plans', 'SELECT')
  and has_table_privilege('authenticated', 'public.billing_plans', 'SELECT')
  and not has_table_privilege('anon', 'public.billing_plans', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.billing_plans', 'INSERT,UPDATE,DELETE'),
  'o catálogo não está somente leitura para a API'
);

select pg_temp.assert_true(
  has_table_privilege('authenticated', 'public.subscriptions', 'SELECT')
  and not has_table_privilege('authenticated', 'public.subscriptions', 'INSERT,UPDATE,DELETE')
  and has_table_privilege('authenticated', 'public.billing_events', 'SELECT')
  and not has_table_privilege('authenticated', 'public.billing_events', 'INSERT,UPDATE,DELETE')
  and has_table_privilege('authenticated', 'public.account_usage', 'SELECT')
  and not has_table_privilege('authenticated', 'public.account_usage', 'INSERT,UPDATE,DELETE'),
  'uma tabela privada permite escrita direta pelo usuário'
);

select pg_temp.assert_true(
  not has_function_privilege(
    'anon',
    to_regprocedure('public.initialize_billing_account(uuid)'),
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    to_regprocedure('public.initialize_billing_account(uuid)'),
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    to_regprocedure('public.handle_new_billing_account()'),
    'EXECUTE'
  ),
  'uma função interna de cobrança pode ser chamada pela API'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select pg_temp.assert_true(
  (select count(*) = 1 from public.subscriptions),
  'o usuário não vê exatamente a própria assinatura'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.billing_events),
  'o usuário não vê exatamente os próprios eventos de cobrança'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.account_usage),
  'o usuário não vê exatamente o próprio período de uso'
);
select pg_temp.assert_true(
  (select count(*) = 2 from public.billing_plans),
  'o catálogo público ativo não está disponível'
);

reset role;

select pg_temp.assert_true(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('subscriptions', 'billing_events', 'account_usage')
      and cmd <> 'SELECT'
  ),
  'há política de escrita direta em tabela privada de cobrança'
);

select pg_temp.assert_true(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('subscriptions', 'billing_events', 'account_usage')
      and concat_ws(' ', qual, with_check) not ilike '%auth.uid()%'
  ),
  'há política privada de cobrança sem vínculo com auth.uid()'
);

rollback;

select 'Billing foundation test passed' as result;
