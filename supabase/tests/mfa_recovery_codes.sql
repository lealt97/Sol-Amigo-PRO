\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'MFA recovery codes test failed: %', message;
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
  'a1000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'mfa-recovery@solamigo.test',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"MFA Recovery Test","company_name":"SolAmigo Test"}'::jsonb,
  now(),
  now()
);

insert into auth.mfa_factors (
  id,
  user_id,
  friendly_name,
  factor_type,
  status,
  created_at,
  updated_at
) values (
  'a2000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'Fator TOTP de homologação',
  'totp',
  'verified',
  now(),
  now()
);

update public.profiles
set mfa_enabled = true
where id = 'a1000000-0000-4000-8000-000000000001';

create temp table generated_recovery_codes (
  generation integer not null,
  code text not null
) on commit drop;

grant select, insert on generated_recovery_codes to authenticated, service_role;

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;

insert into generated_recovery_codes (generation, code)
select 1, unnest(public.generate_mfa_recovery_codes());

select pg_temp.assert_true(
  (select count(*) = 10 from generated_recovery_codes where generation = 1),
  'a geração não retornou dez códigos'
);

select pg_temp.assert_true(
  (select count(distinct code) = 10 from generated_recovery_codes where generation = 1),
  'a geração retornou códigos repetidos'
);

select pg_temp.assert_true(
  (select bool_and(code ~ '^[A-F0-9]{4}(-[A-F0-9]{4}){5}$') from generated_recovery_codes where generation = 1),
  'um código não possui o formato de 96 bits esperado'
);

select pg_temp.assert_true(
  (public.get_mfa_recovery_code_status() ->> 'unusedCount')::integer = 10,
  'o status não informou dez códigos disponíveis'
);

reset role;

select pg_temp.assert_true(
  (select count(*) = 10
   from public.mfa_recovery_codes
   where user_id = 'a1000000-0000-4000-8000-000000000001'
     and used_at is null
     and revoked_at is null),
  'os hashes ativos não foram persistidos'
);

select pg_temp.assert_true(
  (select bool_and(length(code_hash) = 64 and code_hash <> public.normalize_mfa_recovery_code(generated.code))
   from public.mfa_recovery_codes stored
   join generated_recovery_codes generated
     on stored.code_hint = right(public.normalize_mfa_recovery_code(generated.code), 4)
   where generated.generation = 1),
  'texto puro ou hash inválido foi persistido'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000001","role":"service_role","aal":"aal1"}',
  true
);
set local role service_role;

create temp table consumed_recovery_code (id uuid) on commit drop;
insert into consumed_recovery_code (id)
select public.consume_mfa_recovery_code(
  'a1000000-0000-4000-8000-000000000001',
  (select code from generated_recovery_codes where generation = 1 order by code limit 1)
);

select pg_temp.assert_true(
  (select id is not null from consumed_recovery_code),
  'um código válido não foi consumido'
);

select pg_temp.assert_true(
  public.consume_mfa_recovery_code(
    'a1000000-0000-4000-8000-000000000001',
    (select code from generated_recovery_codes where generation = 1 order by code limit 1)
  ) is null,
  'o mesmo código foi aceito mais de uma vez'
);

select pg_temp.assert_true(
  public.consume_mfa_recovery_code(
    'a1000000-0000-4000-8000-000000000001',
    'FFFF-FFFF-FFFF-FFFF-FFFF-FFFF'
  ) is null,
  'um código inexistente foi aceito'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;

select pg_temp.assert_true(
  (public.get_mfa_recovery_code_status() ->> 'unusedCount')::integer = 9,
  'o código utilizado não foi removido da contagem disponível'
);

insert into generated_recovery_codes (generation, code)
select 2, unnest(public.generate_mfa_recovery_codes());

select pg_temp.assert_true(
  (select count(*) = 10 from generated_recovery_codes where generation = 2),
  'a regeneração não retornou dez códigos novos'
);

select pg_temp.assert_true(
  (public.get_mfa_recovery_code_status() ->> 'unusedCount')::integer = 10,
  'a regeneração não substituiu o conjunto anterior'
);

reset role;

select pg_temp.assert_true(
  (select count(*) = 9
   from public.mfa_recovery_codes
   where user_id = 'a1000000-0000-4000-8000-000000000001'
     and used_at is null
     and revoked_at is not null),
  'os códigos não utilizados do conjunto anterior não foram revogados'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

do $$
declare
  v_blocked boolean := false;
begin
  begin
    perform public.generate_mfa_recovery_codes();
  exception
    when insufficient_privilege then
      v_blocked := true;
  end;

  if not v_blocked then
    raise exception 'MFA recovery codes test failed: sessão AAL1 conseguiu gerar códigos';
  end if;
end;
$$;

reset role;

select 'MFA recovery codes test passed' as result;

rollback;
