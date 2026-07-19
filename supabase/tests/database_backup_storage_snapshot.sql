\set ON_ERROR_STOP on

-- Fingerprint completo dos metadados do Storage. Os bytes dos objetos não ficam no PostgreSQL.
with fingerprints as (
  select
    'storage.buckets' as table_name,
    count(*)::bigint as row_count,
    md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id), '')) as checksum
  from storage.buckets t

  union all

  select
    'storage.objects' as table_name,
    count(*)::bigint as row_count,
    md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id::text), '')) as checksum
  from storage.objects t
)
select table_name, row_count, checksum
from fingerprints
order by table_name;
