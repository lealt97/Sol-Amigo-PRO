\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'Proposal quota test failed: %', message;
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
  'b2000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'quota-owner@solamigo.test',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Quota Owner","company_name":"SolAmigo Quota"}'::jsonb,
  now(),
  now()
);

insert into public.clients (
  id,
  user_id,
  name,
  email
) values (
  'b2000000-0000-4000-8000-000000000010',
  'b2000000-0000-4000-8000-000000000001',
  'Cliente de cota',
  'cliente-quota@solamigo.test'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"b2000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select public.save_proposal_bundle(
  null, null,
  '{"client_id":"b2000000-0000-4000-8000-000000000010","title":"Proposta 1"}'::jsonb,
  null, '[]'::jsonb, 'created', 'Teste de cota 1'
);
select public.save_proposal_bundle(
  null, null,
  '{"client_id":"b2000000-0000-4000-8000-000000000010","title":"Proposta 2"}'::jsonb,
  null, '[]'::jsonb, 'created', 'Teste de cota 2'
);
select public.save_proposal_bundle(
  null, null,
  '{"client_id":"b2000000-0000-4000-8000-000000000010","title":"Proposta 3"}'::jsonb,
  null, '[]'::jsonb, 'created', 'Teste de cota 3'
);
select public.save_proposal_bundle(
  null, null,
  '{"client_id":"b2000000-0000-4000-8000-000000000010","title":"Proposta 4"}'::jsonb,
  null, '[]'::jsonb, 'created', 'Teste de cota 4'
);
select public.save_proposal_bundle(
  null, null,
  '{"client_id":"b2000000-0000-4000-8000-000000000010","title":"Proposta 5"}'::jsonb,
  null, '[]'::jsonb, 'created', 'Teste de cota 5'
);

select pg_temp.assert_true(
  (
    select usage.proposals_created = 5
    from public.account_usage usage
    where usage.account_id = auth.uid()
      and usage.period_start = date_trunc('month', timezone('America/Sao_Paulo', now()))::date
  ),
  'as cinco criações não reservaram exatamente cinco unidades'
);

do $$
begin
  perform public.save_proposal_bundle(
    null, null,
    '{"client_id":"b2000000-0000-4000-8000-000000000010","title":"Proposta bloqueada"}'::jsonb,
    null, '[]'::jsonb, 'created', 'Deve falhar por cota'
  );
  raise exception 'a sexta proposta foi criada apesar da cota gratuita';
exception
  when sqlstate 'P0001' then
    if sqlerrm not like 'Limite mensal de propostas atingido%' then
      raise;
    end if;
end;
$$;

select public.save_proposal_bundle(
  (
    select proposal.id
    from public.proposals proposal
    where proposal.user_id = auth.uid()
    order by proposal.created_at
    limit 1
  ),
  0,
  '{"client_id":"b2000000-0000-4000-8000-000000000010","title":"Proposta editada"}'::jsonb,
  null,
  '[]'::jsonb,
  'updated',
  'Edição não consome nova unidade'
);

select pg_temp.assert_true(
  (
    select usage.proposals_created = 5
    from public.account_usage usage
    where usage.account_id = auth.uid()
      and usage.period_start = date_trunc('month', timezone('America/Sao_Paulo', now()))::date
  ),
  'a edição consumiu uma nova unidade'
);

delete from public.proposals
where id = (
  select proposal.id
  from public.proposals proposal
  where proposal.user_id = auth.uid()
  order by proposal.created_at desc
  limit 1
);

select pg_temp.assert_true(
  (
    select usage.proposals_created = 5
    from public.account_usage usage
    where usage.account_id = auth.uid()
      and usage.period_start = date_trunc('month', timezone('America/Sao_Paulo', now()))::date
  ),
  'a exclusão devolveu indevidamente uma unidade'
);

select pg_temp.assert_true(
  (public.get_my_proposal_quota() ->> 'used')::integer = 5
  and (public.get_my_proposal_quota() ->> 'limit')::integer = 5
  and (public.get_my_proposal_quota() ->> 'remaining')::integer = 0,
  'o RPC de consulta não refletiu a cota atual'
);

reset role;
rollback;

\echo 'Proposal quota enforcement test passed'
