import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const WORKFLOW_PATH = '.github/workflows/migrations-homologation.yml';
const SCRIPT_PATH = '.github/scripts/test-database-backup-restore.sh';
const FIXTURE_PATH = 'supabase/tests/database_backup_fixture.sql';
const SNAPSHOT_PATH = 'supabase/tests/database_backup_snapshot.sql';
const STORAGE_SNAPSHOT_PATH = 'supabase/tests/database_backup_storage_snapshot.sql';
const CLEANUP_PATH = 'supabase/tests/database_backup_cleanup.sql';

test('workflow executa homologação de backup e restauração em Supabase local', async () => {
  const workflow = await readFile(WORKFLOW_PATH, 'utf8');

  assert.match(workflow, /Testar backup e restauração do banco/);
  assert.match(workflow, /test-database-backup-restore\.sh migration-report/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /retention-days: 14/);
});

test('backup lógico inclui autenticação, MFA, auditoria, dados comerciais e metadados do Storage', async () => {
  const script = await readFile(SCRIPT_PATH, 'utf8');

  for (const table of [
    'auth.users',
    'auth.identities',
    'auth.mfa_factors',
    'public.mfa_recovery_codes',
    'public.mfa_security_events',
    'public.profiles',
    'public.clients',
    'public.solar_kits',
    'public.proposals',
    'public.solar_system_calculations',
    'public.proposal_loads',
    'public.proposal_events',
    'public.pdf_templates',
    'public.pdf_user_models',
    'public.proposal_sequences',
    'storage.buckets',
    'storage.objects',
  ]) {
    assert.match(script, new RegExp(`--table=${table.replace('.', '\\.')}`));
  }

  assert.match(script, /pg_dump/);
  assert.match(script, /--format=custom/);
  assert.match(script, /--data-only/);
  assert.match(script, /pg_restore/);
  assert.match(script, /--exit-on-error/);
});

test('restauração usa proprietários internos com gatilhos ativos e ordem controlada', async () => {
  const script = await readFile(SCRIPT_PATH, 'utf8');

  assert.match(script, /--username=supabase_auth_admin/);
  assert.match(script, /--username=postgres/);
  assert.match(script, /--username=supabase_storage_admin/);
  assert.match(script, /delete from public\.profiles where id =/);
  assert.match(script, /triggers=active/);
  assert.doesNotMatch(script, /--disable-triggers/);
});

test('restauração compara fixture, códigos, eventos MFA e metadados completos do Storage', async () => {
  const [script, fixture, snapshot, storageSnapshot, cleanup] = await Promise.all([
    readFile(SCRIPT_PATH, 'utf8'),
    readFile(FIXTURE_PATH, 'utf8'),
    readFile(SNAPSHOT_PATH, 'utf8'),
    readFile(STORAGE_SNAPSHOT_PATH, 'utf8'),
    readFile(CLEANUP_PATH, 'utf8'),
  ]);

  assert.match(script, /diff -u "\$\{BEFORE_FILE\}" "\$\{AFTER_FILE\}"/);
  assert.match(script, /diff -u "\$\{STORAGE_BEFORE_FILE\}" "\$\{STORAGE_AFTER_FILE\}"/);
  assert.match(script, /delete from storage\.objects; delete from storage\.buckets;/);
  assert.match(script, /fingerprint-final-cleanup\.txt/);
  assert.match(script, /storage_scope=complete_database_metadata/);
  assert.match(script, /join public\.mfa_recovery_codes/);
  assert.match(script, /join public\.mfa_security_events/);

  assert.match(fixture, /backup-restore@solamigo\.invalid/);
  assert.doesNotMatch(fixture, /encrypted_password/);
  assert.match(fixture, /Fator descartável de backup/);
  assert.match(fixture, /insert into public\.mfa_recovery_codes/);
  assert.match(fixture, /insert into public\.mfa_security_events/);
  assert.match(fixture, /backup-restore-fixture/);

  assert.match(snapshot, /md5\(coalesce\(string_agg\(to_jsonb\(t\)::text/);
  assert.match(snapshot, /public\.mfa_recovery_codes/);
  assert.match(snapshot, /public\.mfa_security_events/);
  assert.match(snapshot, /order by table_name/);
  assert.match(storageSnapshot, /storage\.buckets/);
  assert.match(storageSnapshot, /storage\.objects/);

  assert.match(cleanup, /delete from public\.proposal_events/);
  assert.match(cleanup, /delete from public\.mfa_recovery_codes/);
  assert.match(cleanup, /delete from public\.mfa_security_events/);
  assert.match(cleanup, /delete from auth\.users/);
  assert.match(cleanup, /raise exception 'database backup fixture cleanup failed'/);
});
