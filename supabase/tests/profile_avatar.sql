\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'Profile avatar test failed: %', message;
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
  'authenticated', 'authenticated', 'avatar-owner@solamigo.test', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Avatar Owner"}'::jsonb, now(), now()
),
(
  'c1000000-0000-4000-8000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'avatar-other@solamigo.test', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Avatar Other"}'::jsonb, now(), now()
);

select pg_temp.assert_true(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'avatar_url'
      and data_type = 'text'
  ),
  'a coluna avatar_url não existe em profiles'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

update public.profiles
set avatar_url = 'https://example.invalid/storage/v1/object/public/logos/c1000000-0000-4000-8000-000000000001/avatars/profile.webp'
where id = 'c1000000-0000-4000-8000-000000000001';

update public.profiles
set avatar_url = 'https://example.invalid/unauthorized.webp'
where id = 'c1000000-0000-4000-8000-000000000002';

select pg_temp.assert_true(
  (select avatar_url like '%/c1000000-0000-4000-8000-000000000001/avatars/%'
   from public.profiles
   where id = 'c1000000-0000-4000-8000-000000000001'),
  'o usuário não conseguiu salvar a própria foto'
);

reset role;

select pg_temp.assert_true(
  (select avatar_url is null
   from public.profiles
   where id = 'c1000000-0000-4000-8000-000000000002'),
  'um usuário alterou a foto de outra conta'
);

rollback;

select 'Profile avatar test passed' as result;
