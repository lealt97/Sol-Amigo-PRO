import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const MIGRATION_PATH = 'supabase/migrations/20260719235930_mfa_security_events.sql';
const SQL_TEST_PATH = 'supabase/tests/mfa_security_events.sql';
const WORKFLOW_PATH = '.github/workflows/migrations-homologation.yml';
const CHECKLIST_PATH = 'docs/PROJECT_COMPLETION_CHECKLIST.md';
const RECOVERY_FUNCTION_PATH = 'supabase/functions/mfa-recovery/index.ts';

test('migration cria trilha MFA imutável, isolada e sem escrita pela API', async () => {
  const migration = await readFile(MIGRATION_PATH, 'utf8');

  assert.match(migration, /create table if not exists public\.mfa_security_events/);
  assert.match(migration, /event_type in \('mfa_activated', 'mfa_removed'\)/);
  assert.match(migration, /alter table public\.mfa_security_events enable row level security/);
  assert.match(migration, /for select[\s\S]*auth\.uid\(\) = user_id/);
  assert.match(migration, /revoke all on table public\.mfa_security_events/);
  assert.match(migration, /grant select on table public\.mfa_security_events/);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete|all) on table public\.mfa_security_events\s+to authenticated/i);
});

test('gatilho registra somente a primeira ativação e a remoção do último fator', async () => {
  const migration = await readFile(MIGRATION_PATH, 'utf8');

  assert.match(migration, /create or replace function public\.audit_mfa_factor_state_change\(\)/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = public, auth, pg_temp/);
  assert.match(migration, /after insert or update of status or delete/);
  assert.match(migration, /on auth\.mfa_factors/);
  assert.match(migration, /v_verified_count = 1/);
  assert.match(migration, /v_verified_count = 0/);
  assert.match(migration, /'mfa_activated'/);
  assert.match(migration, /'mfa_removed'/);
  assert.match(migration, /revoke execute on function public\.audit_mfa_factor_state_change\(\)/);
});

test('eventos não persistem segredos, códigos ou material de recuperação', async () => {
  const [migration, sqlTest] = await Promise.all([
    readFile(MIGRATION_PATH, 'utf8'),
    readFile(SQL_TEST_PATH, 'utf8'),
  ]);

  assert.match(migration, /'factor_type'/);
  assert.match(migration, /'source', 'auth\.mfa_factors_trigger'/);
  assert.match(migration, /'verified_factor_count'/);
  assert.doesNotMatch(migration, /new\.(?:secret|totp|qr_code|recovery_code|code)/i);
  assert.match(sqlTest, /metadata \?\| array\['secret', 'code', 'totp', 'qr_code', 'recovery_code'\]/);
});

test('homologação cobre transições, RLS, imutabilidade e recuperação por Admin API', async () => {
  const [sqlTest, workflow, recoveryFunction] = await Promise.all([
    readFile(SQL_TEST_PATH, 'utf8'),
    readFile(WORKFLOW_PATH, 'utf8'),
    readFile(RECOVERY_FUNCTION_PATH, 'utf8'),
  ]);

  assert.match(sqlTest, /um fator ainda não verificado gerou evento/);
  assert.match(sqlTest, /um fator adicional gerou uma ativação duplicada/);
  assert.match(sqlTest, /a remoção de um fator não final desativou o MFA na auditoria/);
  assert.match(sqlTest, /RLS não limitou a leitura aos eventos da própria conta/);
  assert.match(sqlTest, /trilha não é imutável para authenticated/);
  assert.match(workflow, /Testar eventos de ativação e remoção do MFA/);
  assert.match(workflow, /supabase\/tests\/mfa_security_events\.sql/);
  assert.match(recoveryFunction, /admin\.auth\.admin\.mfa\.deleteFactor/);
});

test('checklist registra a auditoria MFA concluída e sua evidência', async () => {
  const checklist = await readFile(CHECKLIST_PATH, 'utf8');

  assert.match(checklist, /- \[x\] Registrar eventos de ativação e remoção do MFA/);
  assert.match(checklist, /Evidência dos eventos de ativação e remoção do MFA:/);
});
