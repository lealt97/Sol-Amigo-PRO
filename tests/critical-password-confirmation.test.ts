import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SETTINGS_PATH = 'src/pages/Configuracoes.tsx';
const SETTINGS_ROUTE_PATH = 'src/pages/SettingsRoute.tsx';
const ACCOUNT_DATA_PATH = 'src/pages/AccountData.tsx';
const ACCOUNT_CLOSURE_PATH = 'src/pages/AccountClosure.tsx';
const ACCOUNT_DATA_SERVICE_PATH = 'src/services/accountDataService.ts';
const ACCOUNT_DELETE_PATH = 'supabase/functions/account-delete/index.ts';
const MFA_SETTINGS_PATH = 'src/components/auth/MfaSettingsCard.tsx';
const MIGRATION_PATH = 'supabase/migrations/20260719235500_require_recent_password_confirmation.sql';
const SQL_TEST_PATH = 'supabase/tests/critical_password_confirmation.sql';
const WORKFLOW_PATH = '.github/workflows/migrations-homologation.yml';
const CHECKLIST_PATH = 'docs/PROJECT_COMPLETION_CHECKLIST.md';

test('alteração de senha exige a senha atual antes da atualização', async () => {
  const settings = await readFile(SETTINGS_PATH, 'utf8');
  const handlerStart = settings.indexOf('const handleUpdatePassword');
  const handlerEnd = settings.indexOf('const handleDeleteAccount');
  const handler = settings.slice(handlerStart, handlerEnd);

  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
  assert.match(handler, /if \(!currentPassword\)/);
  assert.match(handler, /signInWithPassword\(\{ email: user\.email, password: currentPassword \}\)/);
  assert.match(handler, /updateUser\(\{ password: newPassword \}\)/);
  assert.ok(
    handler.indexOf('signInWithPassword') < handler.indexOf('updateUser'),
    'a senha atual deve ser validada antes de atualizar a senha',
  );
});

test('exclusão completa fica em Encerramento da Conta e usa a sessão de senha recém-confirmada', async () => {
  const [closurePage, accountPage, accountService, deleteFunction, settingsRoute] = await Promise.all([
    readFile(ACCOUNT_CLOSURE_PATH, 'utf8'),
    readFile(ACCOUNT_DATA_PATH, 'utf8'),
    readFile(ACCOUNT_DATA_SERVICE_PATH, 'utf8'),
    readFile(ACCOUNT_DELETE_PATH, 'utf8'),
    readFile(SETTINGS_ROUTE_PATH, 'utf8'),
  ]);

  assert.match(closurePage, /Encerramento da Conta/);
  assert.match(closurePage, /excluir a conta/);
  assert.match(closurePage, /signInWithPassword/);
  assert.match(closurePage, /signInData\.session\?\.access_token/);
  assert.match(closurePage, /accountDataService\.deleteAccount\(accessToken\)/);
  assert.ok(
    closurePage.indexOf('signInWithPassword') < closurePage.indexOf('accountDataService.deleteAccount(accessToken)'),
    'a senha atual deve ser validada antes da exclusão completa',
  );

  assert.match(accountService, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(accountPage, /!embedded &&/);
  assert.match(accountPage, /A exclusão definitiva fica em Encerramento da Conta/);

  assert.match(deleteFunction, /PASSWORD_CONFIRMATION_MAX_AGE_SECONDS = 300/);
  assert.match(deleteFunction, /method === 'password'/);
  assert.match(deleteFunction, /removeStoragePaths/);
  assert.match(deleteFunction, /admin\.auth\.admin\.deleteUser/);
  assert.ok(
    deleteFunction.lastIndexOf('removeStoragePaths') < deleteFunction.indexOf('admin.auth.admin.deleteUser'),
    'os arquivos devem ser removidos antes de excluir o usuário',
  );

  assert.match(settingsRoute, /'Encerramento da Conta': 'encerramento'/);
  assert.match(settingsRoute, /activeTab === 'encerramento'/);
  assert.match(settingsRoute, /<AccountClosure \/>/);
  assert.match(settingsRoute, /activeTab === 'seguranca'/);
  assert.match(settingsRoute, /<AccountData embedded \/>/);
});

test('desativação do MFA exige senha atual e TOTP na ordem correta', async () => {
  const mfaSettings = await readFile(MFA_SETTINGS_PATH, 'utf8');
  const handlerStart = mfaSettings.indexOf('const disableMfa');
  const handlerEnd = mfaSettings.indexOf('const copySecret');
  const handler = mfaSettings.slice(handlerStart, handlerEnd);

  assert.match(mfaSettings, /const \[disablePassword, setDisablePassword\] = useState\(''\)/);
  assert.match(mfaSettings, /id="mfa-disable-password"/);
  assert.match(mfaSettings, /autoComplete="current-password"/);
  assert.match(handler, /if \(!disablePassword\)/);
  assert.match(mfaSettings, /supabase\.auth\.getUser\(\)/);
  assert.match(handler, /signInWithPassword/);
  assert.match(handler, /challengeAndVerifyFactor/);
  assert.match(handler, /mfa\.unenroll/);
  assert.ok(
    handler.indexOf('signInWithPassword') < handler.indexOf('challengeAndVerifyFactor'),
    'a senha deve ser confirmada antes do desafio TOTP',
  );
  assert.ok(
    handler.indexOf('challengeAndVerifyFactor') < handler.indexOf('mfa.unenroll'),
    'o TOTP deve ser confirmado antes de remover o fator',
  );
});

test('banco reconhece autenticação por senha recente e bloqueia a RPC legada', async () => {
  const [migration, sqlTest, workflow] = await Promise.all([
    readFile(MIGRATION_PATH, 'utf8'),
    readFile(SQL_TEST_PATH, 'utf8'),
    readFile(WORKFLOW_PATH, 'utf8'),
  ]);

  assert.match(migration, /has_recent_password_confirmation/);
  assert.match(migration, /authentication_method ->> 'method' = 'password'/);
  assert.match(migration, /has_recent_password_confirmation\(300\)/);
  assert.match(migration, /raise exception 'password_confirmation_required'/);
  assert.match(migration, /revoke all on function public\.has_recent_password_confirmation/);

  assert.match(sqlTest, /uma confirmação de senha expirada foi aceita/);
  assert.match(sqlTest, /uma confirmação de senha recente foi rejeitada/);
  assert.match(sqlTest, /magic link foi tratado como confirmação da senha atual/);
  assert.match(sqlTest, /RPC legada permaneceu executável/);
  assert.match(workflow, /Testar confirmação de senha em operações críticas/);
  assert.match(workflow, /critical_password_confirmation\.sql/);
});

test('checklist registra a confirmação de senha como concluída', async () => {
  const checklist = await readFile(CHECKLIST_PATH, 'utf8');

  assert.match(checklist, /- \[x\] Exigir confirmação de senha para operações críticas/);
  assert.match(checklist, /Evidência da confirmação de senha em operações críticas:/);
});
