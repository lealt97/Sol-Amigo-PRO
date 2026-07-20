#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
REPORT_BASE="${1:-migration-report}"
REPORT_DIR="${REPORT_BASE}/database-backup-restore"
BACKUP_FILE="${REPORT_DIR}/solamigo-logical-data.backup"
CONTAINER_BACKUP_FILE="/tmp/solamigo-logical-data.backup"
AUTH_LIST="/tmp/solamigo-auth.list"
PUBLIC_LIST="/tmp/solamigo-public.list"
STORAGE_LIST="/tmp/solamigo-storage.list"
BEFORE_FILE="${REPORT_DIR}/fingerprint-before.txt"
REMOVED_FILE="${REPORT_DIR}/fingerprint-after-removal.txt"
AFTER_FILE="${REPORT_DIR}/fingerprint-after-restore.txt"
STORAGE_BEFORE_FILE="${REPORT_DIR}/storage-fingerprint-before.txt"
STORAGE_REMOVED_FILE="${REPORT_DIR}/storage-fingerprint-after-removal.txt"
STORAGE_AFTER_FILE="${REPORT_DIR}/storage-fingerprint-after-restore.txt"
DB_CONTAINER="${DB_CONTAINER:-$(docker ps --filter 'name=^/supabase_db_' --format '{{.Names}}' | head -n 1)}"
LOCAL_DB_PASSWORD="${LOCAL_DB_PASSWORD:-$(docker exec "${DB_CONTAINER}" printenv POSTGRES_PASSWORD 2>/dev/null || true)}"
LOCAL_DB_PASSWORD="${LOCAL_DB_PASSWORD:-postgres}"

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

storage_snapshot() {
  psql "${DB_URL}" -X -q -A -t -F '|' -v ON_ERROR_STOP=1 \
    -f supabase/tests/database_backup_storage_snapshot.sql \
    | sed '/^[[:space:]]*$/d'
}

cleanup_fixture() {
  psql_cmd -f supabase/tests/database_backup_cleanup.sql >/dev/null 2>&1 || true
  docker exec "${DB_CONTAINER}" rm -f \
    "${CONTAINER_BACKUP_FILE}" "${AUTH_LIST}" "${PUBLIC_LIST}" "${STORAGE_LIST}" \
    >/dev/null 2>&1 || true
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

storage_snapshot | tee "${STORAGE_BEFORE_FILE}"

TABLE_ARGS=(
  --table=auth.users
  --table=auth.identities
  --table=auth.mfa_factors
  --table=public.mfa_recovery_codes
  --table=public.mfa_security_events
  --table=public.subscriptions
  --table=public.billing_events
  --table=public.account_usage
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
docker exec "${DB_CONTAINER}" rm -f \
  "${CONTAINER_BACKUP_FILE}" "${AUTH_LIST}" "${PUBLIC_LIST}" "${STORAGE_LIST}"
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
  users identities mfa_factors mfa_recovery_codes mfa_security_events subscriptions billing_events account_usage \
  profiles clients solar_kits proposals solar_system_calculations proposal_loads proposal_events pdf_templates \
  pdf_user_models proposal_sequences buckets objects; do
  grep -Eq "TABLE DATA [^ ]+ ${table_name} " "${REPORT_DIR}/archive-manifest.txt"
done

printf '3. Simulando perda dos dados da aplicação\n'
psql_cmd -f supabase/tests/database_backup_cleanup.sql \
  2>&1 | tee "${REPORT_DIR}/fixture-remove.log"

printf '3.1. Simulando perda completa dos metadados do Storage\n'
psql_cmd -c 'delete from storage.objects; delete from storage.buckets;' \
  2>&1 | tee "${REPORT_DIR}/storage-metadata-remove.log"

snapshot | tee "${REMOVED_FILE}"
awk -F '|' '
  NF != 3 { bad = 1 }
  $2 != 0 { bad = 1 }
  END { exit bad }
' "${REMOVED_FILE}"

storage_snapshot | tee "${STORAGE_REMOVED_FILE}"
awk -F '|' '
  NF != 3 { bad = 1 }
  $2 != 0 { bad = 1 }
  END { exit bad }
' "${STORAGE_REMOVED_FILE}"

printf '4. Restaurando o backup lógico por proprietário\n'
docker exec "${DB_CONTAINER}" sh -lc \
  "pg_restore --list '${CONTAINER_BACKUP_FILE}' | grep 'TABLE DATA auth ' > '${AUTH_LIST}'"
docker exec "${DB_CONTAINER}" sh -lc \
  "pg_restore --list '${CONTAINER_BACKUP_FILE}' | grep 'TABLE DATA public ' > '${PUBLIC_LIST}'"
docker exec "${DB_CONTAINER}" sh -lc \
  "pg_restore --list '${CONTAINER_BACKUP_FILE}' | grep 'TABLE DATA storage ' > '${STORAGE_LIST}'"

{
  printf '%s\n' '--- auth: supabase_auth_admin ---'
  docker exec -e PGPASSWORD="${LOCAL_DB_PASSWORD}" "${DB_CONTAINER}" pg_restore \
    --host=127.0.0.1 \
    --username=supabase_auth_admin \
    --dbname=postgres \
    --data-only \
    --no-owner \
    --no-privileges \
    --exit-on-error \
    --use-list="${AUTH_LIST}" \
    "${CONTAINER_BACKUP_FILE}"

  printf '%s\n' '--- remover registros automáticos criados pelos gatilhos de auth ---'
  psql_cmd -c "
    delete from public.billing_events where account_id = 'b1000000-0000-4000-8000-000000000001';
    delete from public.account_usage where account_id = 'b1000000-0000-4000-8000-000000000001';
    delete from public.subscriptions where account_id = 'b1000000-0000-4000-8000-000000000001';
    delete from public.profiles where id = 'b1000000-0000-4000-8000-000000000001';
  "

  printf '%s\n' '--- public: postgres ---'
  docker exec -e PGPASSWORD="${LOCAL_DB_PASSWORD}" "${DB_CONTAINER}" pg_restore \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=postgres \
    --data-only \
    --no-owner \
    --no-privileges \
    --exit-on-error \
    --use-list="${PUBLIC_LIST}" \
    "${CONTAINER_BACKUP_FILE}"

  printf '%s\n' '--- storage: supabase_storage_admin ---'
  docker exec -e PGPASSWORD="${LOCAL_DB_PASSWORD}" "${DB_CONTAINER}" pg_restore \
    --host=127.0.0.1 \
    --username=supabase_storage_admin \
    --dbname=postgres \
    --data-only \
    --no-owner \
    --no-privileges \
    --exit-on-error \
    --use-list="${STORAGE_LIST}" \
    "${CONTAINER_BACKUP_FILE}"
} 2>&1 | tee "${REPORT_DIR}/restore.log"

snapshot | tee "${AFTER_FILE}"
diff -u "${BEFORE_FILE}" "${AFTER_FILE}" \
  | tee "${REPORT_DIR}/fingerprint-diff.txt"

storage_snapshot | tee "${STORAGE_AFTER_FILE}"
diff -u "${STORAGE_BEFORE_FILE}" "${STORAGE_AFTER_FILE}" \
  | tee "${REPORT_DIR}/storage-fingerprint-diff.txt"

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
    join public.mfa_recovery_codes r on r.user_id = u.id and r.factor_id = m.id
    join public.mfa_security_events a on a.user_id = u.id and a.factor_id = m.id
    join public.subscriptions s on s.account_id = u.id
    join public.billing_events b on b.account_id = u.id and b.subscription_id = s.id
    join public.account_usage usage on usage.account_id = u.id and usage.plan_code = s.plan_code
    join public.profiles p on p.id = u.id
    where u.id = 'b1000000-0000-4000-8000-000000000001'
      and r.id = 'b1000000-0000-4000-8000-000000000004'
      and a.id = 'b1000000-0000-4000-8000-000000000005'
      and s.id = 'b1100000-0000-4000-8000-000000000001'
      and b.id = 'b1100000-0000-4000-8000-000000000002'
      and usage.id = 'b1100000-0000-4000-8000-000000000003'
  ),
  'identidade, MFA, cobrança, uso ou perfil não foi restaurado'
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

docker exec "${DB_CONTAINER}" rm -f \
  "${CONTAINER_BACKUP_FILE}" "${AUTH_LIST}" "${PUBLIC_LIST}" "${STORAGE_LIST}"
trap - EXIT

cat > "${REPORT_DIR}/summary.txt" <<EOF
result=passed
backup_format=pg_dump_custom_data_only
backup_size_bytes=$(stat -c '%s' "${BACKUP_FILE}")
backup_sha256=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
fixture_tables=$(wc -l < "${BEFORE_FILE}" | tr -d ' ')
storage_scope=complete_database_metadata
postgres_tools_source=supabase_database_container
restore_connections=supabase_auth_admin,postgres,supabase_storage_admin
triggers=active
EOF

cat "${REPORT_DIR}/summary.txt"
