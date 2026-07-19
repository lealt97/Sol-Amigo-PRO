-- =========================================================
-- Códigos de recuperação de uso único para MFA
-- - 10 códigos de 96 bits, exibidos somente na geração
-- - somente hashes SHA-256 são persistidos
-- - geração exige sessão AAL2 e fator TOTP verificado
-- - consumo ocorre exclusivamente pela Edge Function com service_role
-- =========================================================

begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  factor_id uuid not null,
  code_hash text not null,
  code_hint text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  revoked_at timestamptz,
  constraint mfa_recovery_codes_hash_format
    check (code_hash ~ '^[0-9a-f]{64}$'),
  constraint mfa_recovery_codes_hint_format
    check (code_hint ~ '^[A-F0-9]{4}$'),
  constraint mfa_recovery_codes_user_hash_unique
    unique (user_id, code_hash)
);

create index if not exists mfa_recovery_codes_active_user_idx
  on public.mfa_recovery_codes (user_id, factor_id, created_at desc)
  where used_at is null and revoked_at is null;

alter table public.mfa_recovery_codes enable row level security;

revoke all on table public.mfa_recovery_codes from public, anon, authenticated;

create or replace function public.normalize_mfa_recovery_code(p_code text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select regexp_replace(upper(coalesce(p_code, '')), '[^A-F0-9]', '', 'g');
$$;

create or replace function public.hash_mfa_recovery_code(p_code text)
returns text
language sql
immutable
set search_path = public, extensions, pg_temp
as $$
  select encode(
    extensions.digest(public.normalize_mfa_recovery_code(p_code), 'sha256'),
    'hex'
  );
$$;

create or replace function public.generate_mfa_recovery_codes()
returns text[]
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_factor_id uuid;
  v_raw text;
  v_code text;
  v_codes text[] := array[]::text[];
  v_index integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'insufficient_aal' using errcode = '42501';
  end if;

  select factor.id
    into v_factor_id
  from auth.mfa_factors factor
  where factor.user_id = v_user_id
    and factor.status = 'verified'
    and factor.factor_type = 'totp'
  order by factor.created_at desc
  limit 1;

  if v_factor_id is null then
    raise exception 'verified_mfa_factor_required' using errcode = 'P0001';
  end if;

  update public.mfa_recovery_codes
  set revoked_at = coalesce(revoked_at, now())
  where user_id = v_user_id
    and used_at is null
    and revoked_at is null;

  for v_index in 1..10 loop
    v_raw := upper(encode(extensions.gen_random_bytes(12), 'hex'));
    v_code := concat_ws(
      '-',
      substr(v_raw, 1, 4),
      substr(v_raw, 5, 4),
      substr(v_raw, 9, 4),
      substr(v_raw, 13, 4),
      substr(v_raw, 17, 4),
      substr(v_raw, 21, 4)
    );

    insert into public.mfa_recovery_codes (
      user_id,
      factor_id,
      code_hash,
      code_hint
    ) values (
      v_user_id,
      v_factor_id,
      public.hash_mfa_recovery_code(v_code),
      right(v_raw, 4)
    );

    v_codes := array_append(v_codes, v_code);
  end loop;

  return v_codes;
end;
$$;

create or replace function public.get_mfa_recovery_code_status()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_factor_id uuid;
  v_unused_count integer := 0;
  v_generated_at timestamptz;
  v_last_used_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select factor.id
    into v_factor_id
  from auth.mfa_factors factor
  where factor.user_id = v_user_id
    and factor.status = 'verified'
    and factor.factor_type = 'totp'
  order by factor.created_at desc
  limit 1;

  if v_factor_id is not null then
    select
      count(*) filter (where used_at is null and revoked_at is null),
      max(created_at),
      max(used_at)
    into v_unused_count, v_generated_at, v_last_used_at
    from public.mfa_recovery_codes
    where user_id = v_user_id
      and factor_id = v_factor_id;
  end if;

  return jsonb_build_object(
    'factorId', v_factor_id,
    'unusedCount', coalesce(v_unused_count, 0),
    'generatedAt', v_generated_at,
    'lastUsedAt', v_last_used_at
  );
end;
$$;

create or replace function public.consume_mfa_recovery_code(
  p_user_id uuid,
  p_code text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_normalized text := public.normalize_mfa_recovery_code(p_code);
  v_code_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if p_user_id is null or length(v_normalized) <> 24 then
    return null;
  end if;

  update public.mfa_recovery_codes target
  set used_at = now()
  where target.id = (
    select code.id
    from public.mfa_recovery_codes code
    join auth.mfa_factors factor
      on factor.id = code.factor_id
     and factor.user_id = code.user_id
     and factor.status = 'verified'
     and factor.factor_type = 'totp'
    where code.user_id = p_user_id
      and code.code_hash = public.hash_mfa_recovery_code(v_normalized)
      and code.used_at is null
      and code.revoked_at is null
    order by code.created_at desc
    for update of code
    limit 1
  )
  returning target.id into v_code_id;

  return v_code_id;
end;
$$;

create or replace function public.restore_mfa_recovery_code(
  p_user_id uuid,
  p_code_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  update public.mfa_recovery_codes
  set used_at = null
  where id = p_code_id
    and user_id = p_user_id
    and revoked_at is null
    and used_at >= now() - interval '10 minutes';

  return found;
end;
$$;

create or replace function public.finalize_mfa_recovery(
  p_user_id uuid,
  p_code_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.mfa_recovery_codes
    where id = p_code_id
      and user_id = p_user_id
      and used_at is not null
  ) then
    return false;
  end if;

  update public.mfa_recovery_codes
  set revoked_at = coalesce(revoked_at, now())
  where user_id = p_user_id
    and used_at is null
    and revoked_at is null;

  update public.profiles
  set mfa_enabled = false,
      updated_at = now()
  where id = p_user_id;

  return true;
end;
$$;

revoke all on function public.normalize_mfa_recovery_code(text) from public, anon, authenticated;
revoke all on function public.hash_mfa_recovery_code(text) from public, anon, authenticated;
revoke all on function public.generate_mfa_recovery_codes() from public, anon;
revoke all on function public.get_mfa_recovery_code_status() from public, anon;
revoke all on function public.consume_mfa_recovery_code(uuid, text) from public, anon, authenticated;
revoke all on function public.restore_mfa_recovery_code(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finalize_mfa_recovery(uuid, uuid) from public, anon, authenticated;

grant execute on function public.generate_mfa_recovery_codes() to authenticated;
grant execute on function public.get_mfa_recovery_code_status() to authenticated;
grant execute on function public.consume_mfa_recovery_code(uuid, text) to service_role;
grant execute on function public.restore_mfa_recovery_code(uuid, uuid) to service_role;
grant execute on function public.finalize_mfa_recovery(uuid, uuid) to service_role;

comment on table public.mfa_recovery_codes is
  'Hashes de códigos MFA de uso único; códigos em texto puro nunca são persistidos.';

commit;
