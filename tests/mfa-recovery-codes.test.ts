import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  formatMfaRecoveryCode,
  isValidMfaRecoveryCode,
  normalizeMfaRecoveryCode,
} from '../src/lib/auth/mfaRecoveryCode';

const MIGRATION_PATH = 'supabase/migrations/20260719223000_mfa_recovery_codes.sql';
const FUNCTION_PATH = 'supabase/functions/mfa-recovery/index.ts';
const CHALLENGE_PATH = 'src/components/auth/MfaChallengeScreen.tsx';
const ROUTE_GUARD_PATH = 'src/components/auth/RouteGuards.tsx';
const SETUP_SCREEN_PATH = 'src/components/auth/MfaRecoveryCodesSetupScreen.tsx';
const WORKFLOW_PATH = '.github/workflows/migrations-homologation.yml';
const CONFIG_PATH = 'supabase/config.toml';

test('normaliza e formata códigos de recuperação sem aceitar caracteres fora do alfabeto', () => {
  assert.equal(
    normalizeMfaRecoveryCode('ab12-cd34 ef56_7890 ghij KLMN opqr'),
    'AB12CD34EF567890',
  );
  assert.equal(
    formatMfaRecoveryCode('a1b2c3d4e5f60718293a4b5c'),
    'A1B2-C3D4-E5F6-0718-293A-4B5C',
  );
  assert.equal(isValidMfaRecoveryCode('A1B2-C3D4-E5F6-0718-293A-4B5C'), true);
  assert.equal(isValidMfaRecoveryCode('A1B2-C3D4'), false);
});

test('migration persiste somente hashes e exige AAL2 para gerar dez códigos', async () => {
  const migration = await readFile(MIGRATION_PATH, 'utf8');

  assert.match(migration, /create table if not exists public\.mfa_recovery_codes/);
  assert.match(migration, /extensions\.digest/);
  assert.match(migration, /extensions\.gen_random_bytes\(12\)/);
  assert.match(migration, /for v_index in 1\.\.10 loop/);
  assert.match(migration, /auth\.jwt\(\) ->> 'aal'.*'aal2'/s);
  assert.match(migration, /factor\.status = 'verified'/);
  assert.match(migration, /used_at is null/);
  assert.match(migration, /revoked_at is null/);
  assert.match(migration, /grant execute on function public\.generate_mfa_recovery_codes\(\) to authenticated/);
  assert.match(migration, /grant execute on function public\.consume_mfa_recovery_code\(uuid, text\) to service_role/);
  assert.doesNotMatch(migration, /\bcode_plaintext\b|\bplain_code\b/);
});

test('consumo é atômico, restrito ao servidor e possui compensação de falha', async () => {
  const [migration, edgeFunction] = await Promise.all([
    readFile(MIGRATION_PATH, 'utf8'),
    readFile(FUNCTION_PATH, 'utf8'),
  ]);

  assert.match(migration, /set used_at = now\(\)/);
  assert.match(migration, /for update of code/);
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.match(migration, /restore_mfa_recovery_code/);
  assert.match(migration, /finalize_mfa_recovery/);

  assert.match(edgeFunction, /readBearerToken/);
  assert.match(edgeFunction, /admin\.auth\.getUser\(accessToken\)/);
  assert.match(edgeFunction, /consume_mfa_recovery_code/);
  assert.match(edgeFunction, /admin\.auth\.admin\.signOut\(accessToken, 'global'\)/);
  assert.match(edgeFunction, /admin\.auth\.admin\.mfa\.listFactors/);
  assert.match(edgeFunction, /admin\.auth\.admin\.mfa\.deleteFactor/);
  assert.match(edgeFunction, /finalize_mfa_recovery/);
  assert.match(edgeFunction, /restore_mfa_recovery_code/);
  assert.doesNotMatch(edgeFunction, /console\.(?:log|error)\([^\n]*\bcode\b/i);
});

test('interface exige salvar os códigos e oferece recuperação no desafio MFA', async () => {
  const [challenge, routeGuard, setupScreen] = await Promise.all([
    readFile(CHALLENGE_PATH, 'utf8'),
    readFile(ROUTE_GUARD_PATH, 'utf8'),
    readFile(SETUP_SCREEN_PATH, 'utf8'),
  ]);

  assert.match(routeGuard, /getMfaRecoveryCodeStatus/);
  assert.match(routeGuard, /recovery-setup/);
  assert.match(routeGuard, /MfaRecoveryCodesSetupScreen/);

  assert.match(setupScreen, /generateMfaRecoveryCodes/);
  assert.match(setupScreen, /Copiar todos/);
  assert.match(setupScreen, /Baixar arquivo/);
  assert.match(setupScreen, /checked=\{acknowledged\}/);
  assert.match(setupScreen, /disabled=\{!codes\.length \|\| !acknowledged\}/);

  assert.match(challenge, /Perdi acesso ao aplicativo autenticador/);
  assert.match(challenge, /recoverMfaWithCode/);
  assert.match(challenge, /scope: 'local'/);
  assert.match(challenge, /Usar código e remover MFA/);
});

test('homologação executa o teste SQL e o gateway e a função validam o JWT', async () => {
  const [workflow, config, sqlTest] = await Promise.all([
    readFile(WORKFLOW_PATH, 'utf8'),
    readFile(CONFIG_PATH, 'utf8'),
    readFile('supabase/tests/mfa_recovery_codes.sql', 'utf8'),
  ]);

  assert.match(workflow, /Testar códigos de recuperação MFA/);
  assert.match(workflow, /supabase\/tests\/mfa_recovery_codes\.sql/);
  assert.match(config, /\[functions\.mfa-recovery\]\s+verify_jwt = true/s);
  assert.match(sqlTest, /count\(\*\) = 10/);
  assert.match(sqlTest, /o mesmo código foi aceito mais de uma vez/);
  assert.match(sqlTest, /sessão AAL1 conseguiu gerar códigos/);
});
