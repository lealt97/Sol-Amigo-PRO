\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'Critical password confirmation test failed: %', message;
  end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'a1000000-0000-4000-8000-000000000001',
    'role', 'authenticated',
    'aal', 'aal1',
    'amr', jsonb_build_array(
      jsonb_build_object(
        'method', 'password',
        'timestamp', extract(epoch from now())::bigint - 301
      )
    )
  )::text,
  true
);

select pg_temp.assert_true(
  not public.has_recent_password_confirmation(300),
  'uma confirmação de senha expirada foi aceita'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'a1000000-0000-4000-8000-000000000001',
    'role', 'authenticated',
    'aal', 'aal1',
    'amr', jsonb_build_array(
      jsonb_build_object(
        'method', 'password',
        'timestamp', extract(epoch from now())::bigint
      )
    )
  )::text,
  true
);

select pg_temp.assert_true(
  public.has_recent_password_confirmation(300),
  'uma confirmação de senha recente foi rejeitada'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'a1000000-0000-4000-8000-000000000001',
    'role', 'authenticated',
    'aal', 'aal1',
    'amr', jsonb_build_array(
      jsonb_build_object(
        'method', 'magiclink',
        'timestamp', extract(epoch from now())::bigint
      )
    )
  )::text,
  true
);

select pg_temp.assert_true(
  not public.has_recent_password_confirmation(300),
  'magic link foi tratado como confirmação da senha atual'
);

select pg_temp.assert_true(
  position(
    'has_recent_password_confirmation(300)'
    in pg_get_functiondef(to_regprocedure('public.delete_user_account()'))
  ) > 0,
  'a exclusão de conta não exige a confirmação recente no servidor'
);

select pg_temp.assert_true(
  has_function_privilege(
    'authenticated',
    to_regprocedure('public.delete_user_account()'),
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    to_regprocedure('public.delete_user_account()'),
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    to_regprocedure('public.has_recent_password_confirmation(integer)'),
    'EXECUTE'
  ),
  'as permissões das funções de confirmação estão incorretas'
);

rollback;

select 'Critical password confirmation test passed' as result;
