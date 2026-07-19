\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'Public token lifecycle test failed: %', message;
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
  '91000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'token-lifecycle@solamigo.test',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Token Test","company_name":"SolAmigo Test"}'::jsonb,
  now(),
  now()
);

update public.profiles
set default_validity_days = 7
where id = '91000000-0000-4000-8000-000000000001';

insert into public.clients (id, user_id, name)
values (
  '92000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  'Cliente Token Test'
);

insert into public.proposals (
  id, user_id, client_id, code, title, status, public_token, public_token_expires_at
) values
  (
    '93000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001',
    'TOKEN-ACTIVE', 'Token ativo', 'pending',
    'active00000000000000000000000001', now() + interval '1 day'
  ),
  (
    '93000000-0000-4000-8000-000000000002',
    '91000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001',
    'TOKEN-EXPIRED', 'Token expirado', 'pending',
    'expired0000000000000000000000001', now() - interval '1 minute'
  ),
  (
    '93000000-0000-4000-8000-000000000003',
    '91000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001',
    'TOKEN-REVOKED', 'Token revogado', 'pending',
    'revoked0000000000000000000000001', now() + interval '1 day'
  ),
  (
    '93000000-0000-4000-8000-000000000004',
    '91000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001',
    'TOKEN-LEGACY', 'Token legado', 'pending',
    'legacy00000000000000000000000001', null
  ),
  (
    '93000000-0000-4000-8000-000000000005',
    '91000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001',
    'TOKEN-ROTATE', 'Token para revogar e renovar', 'pending',
    'rotate00000000000000000000000001', null
  );

-- Simula um token legado criado antes da migration: sem expiração e sem revogação.
update public.proposals
set public_token_expires_at = null
where id = '93000000-0000-4000-8000-000000000004';

update public.proposals
set public_token_revoked_at = now()
where id = '93000000-0000-4000-8000-000000000003';

select pg_temp.assert_true(
  (select public_token_expires_at between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour'
   from public.proposals where id = '93000000-0000-4000-8000-000000000005'),
  'novo token não recebeu a validade padrão da conta'
);

select pg_temp.assert_true(
  public.get_public_proposal('token-inexistente-0000000000000000') is null,
  'token inexistente deveria ser rejeitado'
);

select pg_temp.assert_true(
  public.get_public_proposal('expired0000000000000000000000001') is null,
  'token expirado deveria ser rejeitado'
);

select pg_temp.assert_true(
  public.get_public_proposal('revoked0000000000000000000000001') is null,
  'token revogado deveria ser rejeitado'
);

select pg_temp.assert_true(
  public.get_public_proposal('legacy00000000000000000000000001') is not null,
  'token legado sem expiração deveria continuar válido'
);

select pg_temp.assert_true(
  public.get_public_proposal('active00000000000000000000000001') is not null,
  'token ativo deveria continuar válido'
);

select pg_temp.assert_true(
  (public.update_public_proposal_status(
    'active00000000000000000000000001',
    'approved',
    null,
    '127.0.0.1',
    'token-lifecycle-test'
  ) ->> 'status') = 'approved',
  'token ativo não conseguiu aprovar a proposta'
);

do $$
declare
  v_blocked boolean := false;
begin
  begin
    perform public.update_public_proposal_status(
      'expired0000000000000000000000001', 'approved', null, null, null
    );
  exception when others then
    v_blocked := true;
  end;

  if not v_blocked then
    raise exception 'Public token lifecycle test failed: token expirado alterou o status';
  end if;
end;
$$;

do $$
declare
  v_blocked boolean := false;
begin
  begin
    perform public.update_public_proposal_status(
      'revoked0000000000000000000000001', 'approved', null, null, null
    );
  exception when others then
    v_blocked := true;
  end;

  if not v_blocked then
    raise exception 'Public token lifecycle test failed: token revogado alterou o status';
  end if;
end;
$$;

select pg_temp.assert_true(
  (select status = 'pending' from public.proposals where id = '93000000-0000-4000-8000-000000000002'),
  'proposta com token expirado foi alterada'
);
select pg_temp.assert_true(
  (select status = 'pending' from public.proposals where id = '93000000-0000-4000-8000-000000000003'),
  'proposta com token revogado foi alterada'
);

-- Valida revogação e renovação pelo proprietário autenticado.
select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select pg_temp.assert_true(
  public.revoke_public_proposal_token('93000000-0000-4000-8000-000000000005'),
  'proprietário não conseguiu revogar o token'
);

reset role;

select pg_temp.assert_true(
  public.get_public_proposal('rotate00000000000000000000000001') is null,
  'token continuou válido após revogação'
);

set local role authenticated;

select pg_temp.assert_true(
  (public.rotate_public_proposal_token(
    '93000000-0000-4000-8000-000000000005',
    3
  ) ->> 'validity_days')::integer = 3,
  'proprietário não conseguiu renovar o token'
);

reset role;

select pg_temp.assert_true(
  (select public_token <> 'rotate00000000000000000000000001'
     and public_token_revoked_at is null
     and public_token_expires_at between now() + interval '2 days 23 hours' and now() + interval '3 days 1 hour'
   from public.proposals where id = '93000000-0000-4000-8000-000000000005'),
  'renovação não gerou um token novo e ativo'
);

select pg_temp.assert_true(
  (select count(*) = 2
   from public.proposal_events
   where proposal_id = '93000000-0000-4000-8000-000000000005'
     and event_type in ('public_token_revoked', 'public_token_rotated')),
  'eventos de revogação e renovação não foram registrados'
);

select 'Public token lifecycle test passed' as result;

rollback;
