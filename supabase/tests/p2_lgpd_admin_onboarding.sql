\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'P2 test failed: %', message;
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
  'b6000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'p2-owner@solamigo.test',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{
    "name":"P2 Owner",
    "company_name":"Empresa P2",
    "phone":"11999999999",
    "legal_acceptances":[
      {"document_type":"terms","version":"2026-07-draft"},
      {"document_type":"privacy","version":"2026-07-draft"},
      {"document_type":"refund","version":"2026-07-draft"}
    ]
  }'::jsonb,
  now(),
  now()
), (
  'b6000000-0000-4000-8000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'p2-other@solamigo.test',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"P2 Other","company_name":"Outra Empresa","phone":"11888888888"}'::jsonb,
  now(),
  now()
);

select pg_temp.assert_true(
  (
    select count(*) = 3
    from public.legal_document_versions document
    where document.is_active = true
      and document.review_status = 'draft'
  ),
  'as três minutas legais ativas não foram criadas como draft'
);

select pg_temp.assert_true(
  (
    select count(*) = 3
    from public.account_legal_acceptances acceptance
    where acceptance.account_id = 'b6000000-0000-4000-8000-000000000001'
      and acceptance.source = 'signup'
  ),
  'o aceite informado no cadastro não foi persistido por versão'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"b6000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select pg_temp.assert_true(
  (public.get_my_legal_status() ->> 'complete')::boolean,
  'o titular com três aceites não recebeu status legal completo'
);

select pg_temp.assert_true(
  (public.get_my_onboarding_status() ->> 'total_steps')::integer = 4,
  'o onboarding não foi reduzido às quatro etapas cadastrais'
);

select pg_temp.assert_true(
  not (public.get_my_onboarding_status() ? 'proposal_complete'),
  'o onboarding ainda expõe a etapa do gerador removido'
);

insert into public.beta_feedback (
  account_id,
  category,
  score,
  message,
  context
) values (
  auth.uid(),
  'onboarding',
  8,
  'O primeiro acesso ficou claro durante o teste controlado.',
  '{"route":"/primeiros-passos"}'::jsonb
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.beta_feedback feedback
    where feedback.account_id = auth.uid()
  ),
  'a conta não conseguiu registrar o próprio feedback beta'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.beta_feedback feedback
    where feedback.account_id = 'b6000000-0000-4000-8000-000000000002'
  ),
  'a conta visualizou feedback pertencente a outro usuário'
);

select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.platform_admins', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.admin_audit_logs', 'SELECT,INSERT,UPDATE,DELETE'),
  'papéis ou auditoria administrativa ficaram expostos à API autenticada'
);

select pg_temp.assert_true(
  not has_function_privilege('authenticated', 'public.delete_user_account()', 'EXECUTE'),
  'a exclusão legada do banco continuou acessível sem limpeza do Storage'
);

reset role;
set local role service_role;

insert into public.platform_admins (
  user_id,
  role,
  active,
  created_by
) values (
  'b6000000-0000-4000-8000-000000000001',
  'super_admin',
  true,
  'b6000000-0000-4000-8000-000000000001'
);

insert into public.admin_audit_logs (
  actor_id,
  actor_role,
  action,
  target_account_id,
  reason,
  metadata
) values (
  'b6000000-0000-4000-8000-000000000001',
  'super_admin',
  'admin.account.viewed',
  'b6000000-0000-4000-8000-000000000002',
  'Validação da trilha administrativa do ambiente local.',
  '{"test":true}'::jsonb
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.admin_audit_logs audit
    where audit.target_account_id = 'b6000000-0000-4000-8000-000000000002'
  ),
  'a service_role não conseguiu registrar ação administrativa'
);

reset role;

do $$
begin
  update public.admin_audit_logs
  set reason = 'Alteração indevida'
  where target_account_id = 'b6000000-0000-4000-8000-000000000002';
  raise exception 'o log administrativo pôde ser alterado';
exception
  when insufficient_privilege then
    null;
end;
$$;

do $$
begin
  delete from public.admin_audit_logs
  where target_account_id = 'b6000000-0000-4000-8000-000000000002';
  raise exception 'o log administrativo pôde ser excluído';
exception
  when insufficient_privilege then
    null;
end;
$$;

rollback;

\echo 'P2 LGPD, admin and onboarding test passed'
