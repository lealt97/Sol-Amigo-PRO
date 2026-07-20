-- =========================================================
-- Trilha de auditoria imutável para ativação e remoção do MFA
--
-- O registro ocorre no banco a partir das transições reais em
-- auth.mfa_factors. Assim, o evento também é criado quando o
-- fator é removido pela Admin API durante a recuperação da conta.
-- Nenhum segredo, TOTP, QR Code ou código de recuperação é salvo.
-- =========================================================

begin;

create table if not exists public.mfa_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('mfa_activated', 'mfa_removed')),
  factor_id uuid,
  actor_user_id uuid,
  actor_role text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint mfa_security_events_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists mfa_security_events_user_created_idx
  on public.mfa_security_events (user_id, created_at desc);

alter table public.mfa_security_events enable row level security;

revoke all on table public.mfa_security_events
  from public, anon, authenticated, service_role;

grant select on table public.mfa_security_events
  to authenticated, service_role;

drop policy if exists "Usuário pode visualizar os próprios eventos MFA"
  on public.mfa_security_events;

create policy "Usuário pode visualizar os próprios eventos MFA"
  on public.mfa_security_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.audit_mfa_factor_state_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid;
  v_factor_id uuid;
  v_factor_type text;
  v_verified_count integer;
  v_event_type text;
begin
  if tg_op = 'INSERT' then
    if new.status::text <> 'verified' then
      return new;
    end if;

    v_user_id := new.user_id;
    v_factor_id := new.id;
    v_factor_type := new.factor_type::text;

    select count(*)
      into v_verified_count
      from auth.mfa_factors
     where user_id = v_user_id
       and status::text = 'verified';

    if v_verified_count = 1 then
      v_event_type := 'mfa_activated';
    end if;
  elsif tg_op = 'UPDATE' then
    v_user_id := new.user_id;
    v_factor_id := new.id;
    v_factor_type := new.factor_type::text;

    if old.status::text <> 'verified' and new.status::text = 'verified' then
      select count(*)
        into v_verified_count
        from auth.mfa_factors
       where user_id = v_user_id
         and status::text = 'verified';

      if v_verified_count = 1 then
        v_event_type := 'mfa_activated';
      end if;
    elsif old.status::text = 'verified' and new.status::text <> 'verified' then
      select count(*)
        into v_verified_count
        from auth.mfa_factors
       where user_id = v_user_id
         and status::text = 'verified';

      if v_verified_count = 0 then
        v_event_type := 'mfa_removed';
      end if;
    end if;
  elsif tg_op = 'DELETE' then
    if old.status::text <> 'verified' then
      return old;
    end if;

    v_user_id := old.user_id;
    v_factor_id := old.id;
    v_factor_type := old.factor_type::text;

    select count(*)
      into v_verified_count
      from auth.mfa_factors
     where user_id = v_user_id
       and status::text = 'verified';

    if v_verified_count = 0 then
      v_event_type := 'mfa_removed';
    end if;
  end if;

  if v_event_type is not null then
    insert into public.mfa_security_events (
      user_id,
      event_type,
      factor_id,
      actor_user_id,
      actor_role,
      metadata
    ) values (
      v_user_id,
      v_event_type,
      v_factor_id,
      auth.uid(),
      coalesce(nullif(auth.role(), ''), current_user),
      jsonb_build_object(
        'factor_type', v_factor_type,
        'source', 'auth.mfa_factors_trigger',
        'verified_factor_count', coalesce(v_verified_count, 0)
      )
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke execute on function public.audit_mfa_factor_state_change()
  from public, anon, authenticated, service_role;

drop trigger if exists audit_mfa_factor_state_change
  on auth.mfa_factors;

create trigger audit_mfa_factor_state_change
  after insert or update of status or delete
  on auth.mfa_factors
  for each row
  execute function public.audit_mfa_factor_state_change();

comment on table public.mfa_security_events is
  'Trilha imutável das transições reais de ativação e remoção do MFA.';

comment on function public.audit_mfa_factor_state_change() is
  'Registra somente a primeira ativação e a remoção do último fator MFA verificado.';

commit;
