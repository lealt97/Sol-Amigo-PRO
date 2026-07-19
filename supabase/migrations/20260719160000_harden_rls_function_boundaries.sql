-- =========================================================
-- Endurecimento das fronteiras que podem contornar RLS
--
-- Mantém os fluxos públicos existentes e restringe somente
-- funções internas ou operações que exigem autenticação.
-- =========================================================

do $$
begin
  -- Funções de gatilho: nunca devem ser chamadas diretamente pela API.
  if to_regprocedure('public.handle_new_proposal()') is not null then
    execute 'alter function public.handle_new_proposal() set search_path = public, pg_temp';
    execute 'revoke execute on function public.handle_new_proposal() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'alter function public.handle_new_user() set search_path = public, pg_temp';
    execute 'revoke execute on function public.handle_new_user() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.handle_updated_at()') is not null then
    execute 'alter function public.handle_updated_at() set search_path = public, pg_temp';
    execute 'revoke execute on function public.handle_updated_at() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'alter function public.set_updated_at() set search_path = public, pg_temp';
    execute 'revoke execute on function public.set_updated_at() from public, anon, authenticated';
  end if;

  -- Funções autenticadas: removem acesso anônimo sem mudar o uso logado.
  if to_regprocedure('public.delete_user_account()') is not null then
    execute 'alter function public.delete_user_account() set search_path = public, pg_temp';
    execute 'revoke execute on function public.delete_user_account() from public, anon';
    execute 'grant execute on function public.delete_user_account() to authenticated, service_role';
  end if;

  if to_regprocedure('public.is_proposal_owner(uuid)') is not null then
    execute 'alter function public.is_proposal_owner(uuid) set search_path = public, pg_temp';
    execute 'revoke execute on function public.is_proposal_owner(uuid) from public, anon';
    execute 'grant execute on function public.is_proposal_owner(uuid) to authenticated, service_role';
  end if;

  -- RPCs públicas por token: mantêm anon/authenticated, mas fixam o search_path.
  if to_regprocedure('public.get_public_proposal(text)') is not null then
    execute 'alter function public.get_public_proposal(text) set search_path = public, pg_temp';
  end if;

  if to_regprocedure('public.update_public_proposal_status(text,text,text,text,text)') is not null then
    execute 'alter function public.update_public_proposal_status(text,text,text,text,text) set search_path = public, pg_temp';
  end if;

  if to_regprocedure('public.mark_public_proposal_viewed(text)') is not null then
    execute 'alter function public.mark_public_proposal_viewed(text) set search_path = public, pg_temp';
  end if;

  if to_regprocedure('public.accept_public_proposal(text)') is not null then
    execute 'alter function public.accept_public_proposal(text) set search_path = public, pg_temp';
  end if;

  if to_regprocedure('public.reject_public_proposal(text,text)') is not null then
    execute 'alter function public.reject_public_proposal(text,text) set search_path = public, pg_temp';
  end if;
end
$$;
