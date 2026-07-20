\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'MFA security events test failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  'c1000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'mfa-audit-1@solamigo.test', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"MFA Audit One","company_name":"SolAmigo Test"}'::jsonb,
  now(), now()
),
(
  'c1000000-0000-4000-8000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'mfa-audit-2@solamigo.test', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"MFA Audit Two","company_name":"SolAmigo Test"}'::jsonb,
  now(), now()
);

insert into auth.mfa_factors (
  id, user_id, friendly_name, factor_type, status, created_at, updated_at
) values (
  'c2000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000001',
  'Primeiro fator de auditoria', 'totp', 'unverified', now(), now()
);

select pg_temp.assert_true(
  not exists (
    select 1 from public.mfa_security_events
    where user_id = 'c1000000-0000-4000-8000-000000000001'
  ),
  'um fator ainda não verificado gerou evento'
);

update auth.mfa_factors
set status = 'verified', updated_at = now()
where id = 'c2000000-0000-4000-8000-000000000001';

select pg_temp.assert_true(
  (select count(*) = 1
   from public.mfa_security_events
   where user_id = 'c1000000-0000-4000-8000-000000000001'
     and event_type = 'mfa_activated'),
  'a primeira ativação não gerou exatamente um evento'
);

insert into auth.mfa_factors (
  id, user_id, friendly_name, factor_type, status, created_at, updated_at
) values (
  'c2000000-0000-4000-8000-000000000002',
  'c1000000-0000-4000-8000-000000000001',
  'Segundo fator de auditoria', 'totp', 'verified', now(), now()
);

select pg_temp.assert_true(
  (select count(*) = 1
   from public.mfa_security_events
   where user_id = 'c1000000-0000-4000-8000-000000000001'
     and event_type = 'mfa_activated'),
  'um fator adicional gerou uma ativação duplicada'
);

delete from auth.mfa_factors
where id = 'c2000000-0000-4000-8000-000000000001';

select pg_temp.assert_true(
  not exists (
    select 1 from public.mfa_security_events
    where user_id = 'c1000000-0000-4000-8000-000000000001'
      and event_type = 'mfa_removed'
  ),
  'a remoção de um fator não final desativou o MFA na auditoria'
);

delete from auth.mfa_factors
where id = 'c2000000-0000-4000-8000-000000000002';

select pg_temp.assert_true(
  (select count(*) = 1
   from public.mfa_security_events
   where user_id = 'c1000000-0000-4000-8000-000000000001'
     and event_type = 'mfa_removed'),
  'a remoção do último fator não gerou exatamente um evento'
);

insert into auth.mfa_factors (
  id, user_id, friendly_name, factor_type, status, created_at, updated_at
) values (
  'c2000000-0000-4000-8000-000000000003',
  'c1000000-0000-4000-8000-000000000002',
  'Fator da segunda conta', 'totp', 'verified', now(), now()
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.mfa_security_events
    where metadata ?| array['secret', 'code', 'totp', 'qr_code', 'recovery_code']
  ),
  'a trilha persistiu material secreto ou códigos MFA'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;

select pg_temp.assert_true(
  (select count(*) = 2 from public.mfa_security_events),
  'RLS não limitou a leitura aos eventos da própria conta'
);

select pg_temp.assert_true(
  not exists (
    select 1 from public.mfa_security_events
    where user_id <> 'c1000000-0000-4000-8000-000000000001'
  ),
  'um usuário conseguiu ler eventos MFA de outra conta'
);

do $$
declare
  v_insert_blocked boolean := false;
  v_update_blocked boolean := false;
  v_delete_blocked boolean := false;
begin
  begin
    insert into public.mfa_security_events (user_id, event_type)
    values ('c1000000-0000-4000-8000-000000000001', 'mfa_activated');
  exception when insufficient_privilege then
    v_insert_blocked := true;
  end;

  begin
    update public.mfa_security_events
    set metadata = '{"tampered":true}'::jsonb;
  exception when insufficient_privilege then
    v_update_blocked := true;
  end;

  begin
    delete from public.mfa_security_events;
  exception when insufficient_privilege then
    v_delete_blocked := true;
  end;

  if not (v_insert_blocked and v_update_blocked and v_delete_blocked) then
    raise exception 'MFA security events test failed: trilha não é imutável para authenticated';
  end if;
end;
$$;

reset role;

select pg_temp.assert_true(
  not has_function_privilege(
    'authenticated',
    to_regprocedure('public.audit_mfa_factor_state_change()'),
    'EXECUTE'
  )
  and not has_function_privilege(
    'service_role',
    to_regprocedure('public.audit_mfa_factor_state_change()'),
    'EXECUTE'
  ),
  'a função interna do gatilho pode ser chamada diretamente pela API'
);

select 'MFA security events test passed' as result;

rollback;
