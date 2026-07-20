import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { LEGAL_DOCUMENTS, REQUIRED_LEGAL_ACCEPTANCES } from '../src/lib/legal/legalCatalog';

const read = (path: string) => readFile(path, 'utf8');

const MIGRATION = 'supabase/migrations/20260721010000_p2_lgpd_admin_onboarding.sql';
const REGISTER = 'src/components/auth/RegisterForm.tsx';
const AUTH_SCHEMA = 'src/lib/validations/auth.schema.ts';
const APP = 'src/App.tsx';
const EXPORT_FUNCTION = 'supabase/functions/account-data-export/index.ts';
const DELETE_FUNCTION = 'supabase/functions/account-delete/index.ts';
const ADMIN_FUNCTION = 'supabase/functions/admin-console/index.ts';
const ONBOARDING = 'src/pages/Onboarding.tsx';
const ACCOUNT_DATA = 'src/pages/AccountData.tsx';
const PAYBACK = 'src/components/pdf/sections/PaybackSection.tsx';
const CONFIG = 'supabase/config.toml';

test('documentos legais têm versões alinhadas entre catálogo, banco e cadastro', async () => {
  const [migration, register, schema] = await Promise.all([
    read(MIGRATION),
    read(REGISTER),
    read(AUTH_SCHEMA),
  ]);

  assert.equal(REQUIRED_LEGAL_ACCEPTANCES.length, 3);
  assert.deepEqual(
    REQUIRED_LEGAL_ACCEPTANCES.map((item) => item.document_type).sort(),
    ['privacy', 'refund', 'terms'],
  );

  for (const document of Object.values(LEGAL_DOCUMENTS)) {
    assert.equal(document.reviewStatus, 'draft');
    assert.match(migration, new RegExp(document.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(migration, new RegExp(document.title));
  }

  assert.match(schema, /acceptedLegal: z\.literal\(true/);
  assert.match(register, /legal_acceptances: REQUIRED_LEGAL_ACCEPTANCES/);
  assert.match(register, /\/termos/);
  assert.match(register, /\/privacidade/);
  assert.match(register, /\/cancelamento-reembolso/);
  assert.match(register, /minutas para o beta controlado/);
});

test('aceites legais são versionados, isolados e não armazenam identificadores invasivos', async () => {
  const migration = await read(MIGRATION);

  assert.match(migration, /create table if not exists public\.account_legal_acceptances/);
  assert.match(migration, /primary key \(account_id, document_type, document_version\)/);
  assert.match(migration, /using \(auth\.uid\(\) = account_id\)/);
  assert.match(migration, /record_signup_legal_acceptances/);
  assert.match(migration, /accept_current_legal_documents/);
  assert.doesNotMatch(migration, /ip_address/i);
  assert.doesNotMatch(migration, /user_agent/i);
  assert.doesNotMatch(migration, /cookie/i);
});

test('exportação de dados é autenticada e exclui segredos do pacote', async () => {
  const [source, config] = await Promise.all([read(EXPORT_FUNCTION), read(CONFIG)]);

  assert.match(source, /admin\.auth\.getUser\(accessToken\)/);
  assert.match(source, /solamigo-account-export-v1/);
  assert.match(source, /createSignedUrl\(path, 3600\)/);
  assert.match(source, /mfa_security_events/);
  assert.match(source, /legal_acceptances/);
  assert.match(source, /não contém senhas, segredos MFA, tokens, chaves de pagamento ou dados de cartão/);
  assert.doesNotMatch(source, /encrypted_password/);
  assert.doesNotMatch(source, /mfa_recovery_codes/);
  assert.match(config, /\[functions\.account-data-export\][\s\S]*verify_jwt = true/);
});

test('exclusão completa exige senha recente e remove arquivos antes do usuário', async () => {
  const [source, migration, accountPage, config] = await Promise.all([
    read(DELETE_FUNCTION),
    read(MIGRATION),
    read(ACCOUNT_DATA),
    read(CONFIG),
  ]);

  assert.match(source, /PASSWORD_CONFIRMATION_MAX_AGE_SECONDS = 300/);
  assert.match(source, /method === 'password'/);
  assert.match(source, /collectStoragePaths/);
  assert.match(source, /removeStoragePaths/);
  assert.ok(source.indexOf('removeStoragePaths') < source.lastIndexOf('admin.auth.admin.deleteUser'));
  assert.match(source, /admin\.auth\.admin\.deleteUser\(accountId, false\)/);
  assert.match(migration, /revoke execute on function public\.delete_user_account\(\)[\s\S]*from authenticated/);
  assert.match(accountPage, /accountDataService\.deleteAccount\(\)/);
  assert.match(accountPage, /excluir a conta/);
  assert.match(config, /\[functions\.account-delete\][\s\S]*verify_jwt = true/);
});

test('papel administrativo é validado no servidor e toda mutação gera auditoria', async () => {
  const [migration, source, app, config] = await Promise.all([
    read(MIGRATION),
    read(ADMIN_FUNCTION),
    read(APP),
    read(CONFIG),
  ]);

  assert.match(migration, /create table if not exists public\.platform_admins/);
  assert.match(migration, /role in \('support', 'operations', 'super_admin'\)/);
  assert.match(migration, /create table if not exists public\.admin_audit_logs/);
  assert.match(migration, /before update or delete on public\.admin_audit_logs/);
  assert.match(source, /from\('platform_admins'\)/);
  assert.match(source, /WRITE_ROLES/);
  assert.match(source, /if \(accountId === actorId\)/);
  assert.match(source, /reason\.length < 10/);
  assert.match(source, /writeAudit\(admin/);
  assert.match(source, /ban_duration: block \? '876000h' : 'none'/);
  assert.match(app, /<Route element={<AdminRoute \/>}>/);
  assert.match(config, /\[functions\.admin-console\][\s\S]*verify_jwt = true/);
  assert.doesNotMatch(source, /body\.role/);
});

test('onboarding usa dados reais e registra feedback estruturado do beta', async () => {
  const [migration, page, app] = await Promise.all([
    read(MIGRATION),
    read(ONBOARDING),
    read(APP),
  ]);

  assert.match(migration, /create or replace function public\.get_my_onboarding_status\(\)/);
  assert.match(migration, /exists \([\s\S]*from public\.solar_kits/);
  assert.match(migration, /exists \([\s\S]*from public\.clients/);
  assert.match(migration, /exists \([\s\S]*from public\.proposals/);
  assert.match(migration, /create table if not exists public\.beta_feedback/);
  assert.match(migration, /with check \(auth\.uid\(\) = account_id\)/);
  assert.match(page, /onboardingService\.getStatus\(\)/);
  assert.match(page, /betaFeedbackService\.submit/);
  assert.match(page, /Primeiros passos/);
  assert.match(app, /path="primeiros-passos" element={<Onboarding \/>}/);
});

test('P2 declara explicitamente que o cálculo financeiro é payback simples', async () => {
  const payback = await read(PAYBACK);

  assert.match(payback, /Payback Simples/);
  assert.match(payback, /Importante — estimativa simplificada/);
  assert.match(payback, /não considera inflação energética/);
  assert.match(payback, /não constituem garantia de geração, economia ou retorno financeiro/);
});

test('rotas públicas legais e área privada de dados estão registradas', async () => {
  const app = await read(APP);

  assert.match(app, /path="\/termos"/);
  assert.match(app, /path="\/privacidade"/);
  assert.match(app, /path="\/cancelamento-reembolso"/);
  assert.match(app, /path="privacidade-dados" element={<AccountData \/>}/);
  assert.match(app, /path="admin" element={<AdminDashboard \/>}/);
});
