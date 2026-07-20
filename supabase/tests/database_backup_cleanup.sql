\set ON_ERROR_STOP on

-- Remove somente os registros reservados da homologação, em ordem de dependência.
delete from storage.objects
where id = 'b9000000-0000-4000-8000-000000000001'
   or bucket_id = 'backup-restore-fixture';

delete from storage.buckets
where id = 'backup-restore-fixture';

delete from public.proposal_events
where proposal_id = 'b4000000-0000-4000-8000-000000000001'
   or id = 'b7000000-0000-4000-8000-000000000001';

delete from public.proposal_loads
where proposal_id = 'b4000000-0000-4000-8000-000000000001'
   or id = 'b6000000-0000-4000-8000-000000000001';

delete from public.solar_system_calculations
where proposal_id = 'b4000000-0000-4000-8000-000000000001'
   or id = 'b5000000-0000-4000-8000-000000000001';

delete from public.proposals
where id = 'b4000000-0000-4000-8000-000000000001';

delete from public.pdf_templates
where id = 'b8000000-0000-4000-8000-000000000001';

delete from public.pdf_user_models
where id = 'backup-restore-model';

delete from public.proposal_sequences
where user_id = 'b1000000-0000-4000-8000-000000000001'
  and sequence_year = 2026;

delete from public.solar_kits
where id = 'b3000000-0000-4000-8000-000000000001';

delete from public.clients
where id = 'b2000000-0000-4000-8000-000000000001';

delete from public.mfa_recovery_codes
where user_id = 'b1000000-0000-4000-8000-000000000001'
   or id = 'b1000000-0000-4000-8000-000000000004';

delete from public.mfa_security_events
where user_id = 'b1000000-0000-4000-8000-000000000001'
   or id = 'b1000000-0000-4000-8000-000000000005';

delete from public.billing_events
where account_id = 'b1000000-0000-4000-8000-000000000001'
   or id = 'b1100000-0000-4000-8000-000000000002';

delete from public.account_usage
where account_id = 'b1000000-0000-4000-8000-000000000001'
   or id = 'b1100000-0000-4000-8000-000000000003';

delete from public.subscriptions
where account_id = 'b1000000-0000-4000-8000-000000000001'
   or id = 'b1100000-0000-4000-8000-000000000001';

delete from public.profiles
where id = 'b1000000-0000-4000-8000-000000000001';

delete from auth.mfa_factors
where user_id = 'b1000000-0000-4000-8000-000000000001'
   or id = 'b1000000-0000-4000-8000-000000000003';

delete from auth.identities
where user_id = 'b1000000-0000-4000-8000-000000000001'
   or id = 'b1000000-0000-4000-8000-000000000002';

delete from auth.users
where id = 'b1000000-0000-4000-8000-000000000001';

do $$
begin
  if exists (
    select 1 from auth.users
    where id = 'b1000000-0000-4000-8000-000000000001'
  ) or exists (
    select 1 from public.mfa_recovery_codes
    where id = 'b1000000-0000-4000-8000-000000000004'
  ) or exists (
    select 1 from public.mfa_security_events
    where id = 'b1000000-0000-4000-8000-000000000005'
  ) or exists (
    select 1 from public.subscriptions
    where id = 'b1100000-0000-4000-8000-000000000001'
  ) or exists (
    select 1 from public.billing_events
    where id = 'b1100000-0000-4000-8000-000000000002'
  ) or exists (
    select 1 from public.account_usage
    where id = 'b1100000-0000-4000-8000-000000000003'
  ) or exists (
    select 1 from public.proposals
    where id = 'b4000000-0000-4000-8000-000000000001'
  ) or exists (
    select 1 from storage.buckets
    where id = 'backup-restore-fixture'
  ) then
    raise exception 'database backup fixture cleanup failed';
  end if;
end;
$$;

select 'database backup fixture removed' as result;
