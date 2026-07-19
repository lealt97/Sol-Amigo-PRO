#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
REPORT_BASE="${1:-migration-report}"
REPORT_DIR="${REPORT_BASE}/database-backup-restore"
BACKUP_FILE="${REPORT_DIR}/solamigo-logical-data.backup"
CONTAINER_BACKUP_FILE="/tmp/solamigo-logical-data.backup"
BEFORE_FILE="${REPORT_DIR}/fingerprint-before.txt"
REMOVED_FILE="${REPORT_DIR}/fingerprint-after-removal.txt"
AFTER_FILE="${REPORT_DIR}/fingerprint-after-restore.txt"
DB_CONTAINER="${DB_CONTAINER:-$(docker ps --filter 'name=^/supabase_db_' --format '{{.Names}}' | head -n 1)}"

mkdir -p "${REPORT_DIR}"
test -n "${DB_CONTAINER}"

psql_cmd() {
  psql "${DB_URL}" -X -v ON_ERROR_STOP=1 "$@"
}

snapshot() {
  psql "${DB_URL}" -X -q -A -t -F '|' -v ON_ERROR_STOP=1 \
    -f supabase/tests/database_backup_snapshot.sql \
    | sed '/^[[:space:]]*$/d'
}

cleanup_fixture() {
  psql_cmd -f supabase/tests/database_backup_cleanup.sql >/dev/null 2>&1 || true
  docker exec "${DB_CONTAINER}" rm -f "${CONTAINER_BACKUP_FILE}" >/dev/null 2>&1 || true
}

trap cleanup_fixture EXIT

printf '1. Criando fixture determinística\n'
psql_cmd -f supabase/tests/database_backup_fixture.sql \
  2>&1 | tee "${REPORT_DIR}/fixture-create.log"

snapshot | tee "${BEFORE_FILE}"
awk -F '|' '
  NF != 3 { bad = 1 }
  $2 != 1 { bad = 1 }
  END { exit bad }
' "${BEFORE_FILE}"

TABLE_ARGS=(
  --table=auth.users
  --table=auth.identities
  --table=auth.mfa_factors
  --table=public.profiles
  --table=public.clients
  --table=public.solar_kits
  --table=public.proposals
  --table=public.solar_system_calculations
  --table=public.proposal_loads
  --table=public.proposal_events
  --table=public.pdf_templates
  --table=public.pdf_user_models
  --table=public.proposal_sequences
  --table=storage.buckets
  --table=storage.objects
)

printf '2. Gerando backup lógico em formato custom\n'
docker exec "${DB_CONTAINER}" rm -f "${CONTAINER_BACKUP_FILE}"
docker exec "${DB_CONTAINER}" pg_dump \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --data-only \
  --no-owner \
  --no-privileges \
  --file="${CONTAINER_BACKUP_FILE}" \
  "${TABLE_ARGS[@]}"

docker cp "${DB_CONTAINER}:${CONTAINER_BACKUP_FILE}" "${BACKUP_FILE}"
docker exec "${DB_CONTAINER}" pg_restore --list "${CONTAINER_BACKUP_FILE}" \
  | tee "${REPORT_DIR}/archive-manifest.txt"
sha256sum "${BACKUP_FILE}" | tee "${REPORT_DIR}/archive-sha256.txt"
stat -c '%s' "${BACKUP_FILE}" | tee "${REPORT_DIR}/archive-size-bytes.txt"

test -s "${BACKUP_FILE}"
test "$(stat -c '%s' "${BACKUP_FILE}")" -ge 2048

for table_name in \
  users identities mfa_factors profiles clients solar_kits proposals \
  solar_system_calculations proposal_loads proposal_events pdf_templates \
  pdf_user_models proposal_sequences buckets objects; do
  grep -Eq "TABLE DATA .* ${table_name}$" "${REPORT_DIR}/archive-manifest.txt"
done

printf '3. Simulando perda dos dados da aplicação\n'
psql_cmd -f supabase/tests/database_backup_cleanup.sql \
  2>&1 | tee "${REPORT_DIR}/fixture-remove.log"

snapshot | tee "${REMOVED_FILE}"
awk -F '|' '
  NF != 3 { bad = 1 }
  $2 != 0 { bad = 1 }
  END { exit bad }
' "${REMOVED_FILE}"

printf '4. Restaurando o backup lógico\n'
docker exec "${DB_CONTAINER}" pg_restore \
  --username=postgres \
  --dbname=postgres \
  --data-only \
  --disable-triggers \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "${CONTAINER_BACKUP_FILE}" \
  2>&1 | tee "${REPORT_DIR}/restore.log"

snapshot | tee "${AFTER_FILE}"
diff -u "${BEFORE_FILE}" "${AFTER_FILE}" \
  | tee "${REPORT_DIR}/fingerprint-diff.txt"

printf '5. Validando vínculos restaurados\n'
psql_cmd <<'SQL' 2>&1 | tee "${REPORT_DIR}/relational-integrity.log"
create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'Backup restore validation failed: %', message;
  end if;
end;
$$;

select pg_temp.assert_true(
  exists (
    select 1
    from auth.users u
    join auth.identities i on i.user_id = u.id
    join auth.mfa_factors m on m.user_id = u.id
    join public.profiles p on p.id = u.id
    where u.id = 'b1000000-0000-4000-8000-000000000001'
  ),
  'identidade, MFA ou perfil não foi restaurado'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.proposals p
    join public.clients c on c.id = p.client_id and c.user_id = p.user_id
    join public.solar_kits k on k.id = p.selected_solar_kit_id and k.user_id = p.user_id
    join public.solar_system_calculations s on s.proposal_id = p.id
    join public.proposal_loads l on l.proposal_id = p.id
    join public.proposal_events e on e.proposal_id = p.id
    where p.id = 'b4000000-0000-4000-8000-000000000001'
      and p.revision = 3
      and p.final_price = 28093.34
  ),
  'grafo de cliente, kit, proposta, cálculo, carga ou evento ficou incompleto'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.pdf_templates t
    join public.pdf_user_models m on m.user_id = t.user_id
    where t.id = 'b8000000-0000-4000-8000-000000000001'
      and m.id = 'backup-restore-model'
  ),
  'modelos de PDF não foram restaurados'
);

select pg_temp.assert_true(
  exists (
    select 1
    from storage.objects o
    join storage.buckets b on b.id = o.bucket_id
    where o.id = 'b9000000-0000-4000-8000-000000000001'
      and b.id = 'backup-restore-fixture'
  ),
  'metadados do Storage não foram restaurados'
);

select 'database backup restore validation passed' as result;
SQL

printf '6. Limpando a homologação\n'
psql_cmd -f supabase/tests/database_backup_cleanup.sql \
  2>&1 | tee "${REPORT_DIR}/fixture-final-cleanup.log"

snapshot | tee "${REPORT_DIR}/fingerprint-final-cleanup.txt"
awk -F '|' '
  NF != 3 { bad = 1 }
  $2 != 0 { bad = 1 }
  END { exit bad }
' "${REPORT_DIR}/fingerprint-final-cleanup.txt"

docker exec "${DB_CONTAINER}" rm -f "${CONTAINER_BACKUP_FILE}"
trap - EXIT

cat > "${REPORT_DIR}/summary.txt" <<EOF
result=passed
backup_format=pg_dump_custom_data_only
backup_size_bytes=$(stat -c '%s' "${BACKUP_FILE}")
backup_sha256=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
fixture_tables=$(wc -l < "${BEFORE_FILE}" | tr -d ' ')
storage_scope=database_metadata_only
postgres_tools_source=supabase_database_container
EOF

cat "${REPORT_DIR}/summary.txt"
