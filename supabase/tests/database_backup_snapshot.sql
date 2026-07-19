\set ON_ERROR_STOP on

-- Fingerprint determinístico apenas dos registros reservados para homologação.
with fingerprints as (
  select 'auth.users' as table_name, count(*)::bigint as row_count,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), '')) as checksum
  from auth.users t where id = 'b1000000-0000-4000-8000-000000000001'
  union all
  select 'auth.identities', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), ''))
  from auth.identities t where id = 'b1000000-0000-4000-8000-000000000002'
  union all
  select 'auth.mfa_factors', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), ''))
  from auth.mfa_factors t where id = 'b1000000-0000-4000-8000-000000000003'
  union all
  select 'public.profiles', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), ''))
  from public.profiles t where id = 'b1000000-0000-4000-8000-000000000001'
  union all
  select 'public.clients', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), ''))
  from public.clients t where id = 'b2000000-0000-4000-8000-000000000001'
  union all
  select 'public.solar_kits', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), ''))
  from public.solar_kits t where id = 'b3000000-0000-4000-8000-000000000001'
  union all
  select 'public.proposals', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), ''))
  from public.proposals t where id = 'b4000000-0000-4000-8000-000000000001'
  union all
  select 'public.solar_system_calculations', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), ''))
  from public.solar_system_calculations t where id = 'b5000000-0000-4000-8000-000000000001'
  union all
  select 'public.proposal_loads', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), ''))
  from public.proposal_loads t where id = 'b6000000-0000-4000-8000-000000000001'
  union all
  select 'public.proposal_events', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), ''))
  from public.proposal_events t where id = 'b7000000-0000-4000-8000-000000000001'
  union all
  select 'public.pdf_templates', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), ''))
  from public.pdf_templates t where id = 'b8000000-0000-4000-8000-000000000001'
  union all
  select 'public.pdf_user_models', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), ''))
  from public.pdf_user_models t where id = 'backup-restore-model'
  union all
  select 'public.proposal_sequences', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by user_id::text, sequence_year), ''))
  from public.proposal_sequences t
  where user_id = 'b1000000-0000-4000-8000-000000000001' and sequence_year = 2026
  union all
  select 'storage.buckets', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id), ''))
  from storage.buckets t where id = 'backup-restore-fixture'
  union all
  select 'storage.objects', count(*)::bigint,
         md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), ''))
  from storage.objects t where id = 'b9000000-0000-4000-8000-000000000001'
)
select table_name, row_count, checksum
from fingerprints
order by table_name;
