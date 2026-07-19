\set ON_ERROR_STOP on

-- Remove somente os registros reservados da homologação, em ordem de dependência.
delete from storage.objects
where id = 'b9000000-0000-4000-8000-000000000001';

delete from storage.buckets
where id = 'backup-restore-fixture';

delete from public.proposal_events
where id = 'b7000000-0000-4000-8000-000000000001';

delete from public.proposal_loads
where id = 'b6000000-0000-4000-8000-000000000001';

delete from public.solar_system_calculations
where id = 'b5000000-0000-4000-8000-000000000001';

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

delete from public.profiles
where id = 'b1000000-0000-4000-8000-000000000001';

delete from auth.mfa_factors
where id = 'b1000000-0000-4000-8000-000000000003';

delete from auth.identities
where id = 'b1000000-0000-4000-8000-000000000002';

delete from auth.users
where id = 'b1000000-0000-4000-8000-000000000001';

select case when exists (
  select 1 from auth.users
  where id = 'b1000000-0000-4000-8000-000000000001'
) then pg_catalog.current_setting('server_version')::text else 'database backup fixture removed' end as result;
