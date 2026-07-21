import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { LEGAL_DOCUMENTS, REQUIRED_LEGAL_ACCEPTANCES } from '../src/lib/legal/legalCatalog';

const read = (path: string) => readFile(path, 'utf8');

const MIGRATION = 'supabase/migrations/20260721010000_p2_lgpd_admin_onboarding.sql';
const ONBOARDING_MIGRATION = 'supabase/migrations/20260721020000_remove_proposal_onboarding_step.sql';
const REGISTER = 'src/components/auth/RegisterForm.tsx';
const AUTH_SCHEMA = 'src/lib/validations/auth.schema.ts';
const APP = 'src/App.tsx';
const LAYOUT = 'src/components/Layout.tsx';
const SETTINGS_ROUTE = 'src/pages/SettingsRoute.tsx';
const EXPORT_FUNCTION = 'supabase/functions/account-data-export/index.ts';
const DELETE_FUNCTION = 'supabase/functions/account-delete/index.ts';
const ADMIN_FUNCTION = 'supabase/functions/admin-console/index.ts';
const ONBOARDING = 'src/pages/Onboarding.tsx';
const ACCOUNT_DATA = 'src/pages/AccountData.tsx';
const PROPOSAL_SERVICE = 'src/services/proposalService.ts';
const PROPOSAL_LIST = 'src/pages/propostas/ProposalList.tsx';
const CONFIG = 'supabase/config.toml';

const extractTableDefinition = (migration: string, tableName: string) => {
  const start = migration.indexOf(`create table if not exists public.${tableName}`);
  const end = migration.indexOf('\n);', start);
  assert.ok(start >= 0 && end > start, `Definição da tabela ${tableName} não encontrada.`);
  return migration.slice(start, end + 3);
};

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

  assert.match(schema, /acceptedLegal: z\.boolean\(\)\.refine/);
  assert.match(register, /legal_acceptances: REQUIRED_LEGAL_ACCEPTANCES/);
  assert.match(register, /\/termos/);
  assert.match(register, /\/privacidade/);
  assert.match(register, /\/cancelamento-reembolso/);
  assert.match(register, /minutas para o beta controlado/);
});

test('aceites legais são versionados, isolados e não armazenam identificadores invasivos', async () => {
  const migration = await read(MIGRATION);
  const table = extractTableDefinition(migration, 'account_legal_acceptances');

  assert.match(table, /primary key \(account_id, document_type, document_version\)/);
  assert.match(migration, /using \(auth\.uid\(\) = account_id\)/);
  assert.match(migration, /record_signup_legal_acceptances/);
  assert.match(migration, /accept_current_legal_documents/);
  assert.doesNotMatch(table, /\bip_address\b/i);
  assert.doesNotMatch(table, /\buser_agent\b/i);
  assert.doesNotMatch(table, /\bcookie_value\b/i);
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

test('onboarding não depende mais de proposta ou cálculo', async () => {
  const [migration, page, app] = await Promise.all([
    read(ONBOARDING_MIGRATION),
    read(ONBOARDING),
    read(APP),
  ]);

  assert.match(migration, /'total_steps', 4/);
  assert.match(migration, /from public\.solar_kits/);
  assert.match(migration, /from public\.clients/);
  assert.doesNotMatch(migration, /from public\.proposals/);
  assert.match(page, /total_steps: 4/);
  assert.doesNotMatch(page, /proposal_complete/);
  assert.doesNotMatch(page, /\/propostas\/nova/);
  assert.ok(app.includes('<Route path="/primeiros-passos" element={<Onboarding />} />'));
});

test('Wizard e serviços de cálculo foram retirados das rotas e mutações', async () => {
  const [app, service, list] = await Promise.all([
    read(APP),
    read(PROPOSAL_SERVICE),
    read(PROPOSAL_LIST),
  ]);

  assert.doesNotMatch(app, /ProposalWizard/);
  assert.match(app, /path="propostas\/nova" element=\{null\}/);
  assert.match(app, /path="propostas\/:id\/editar" element=\{null\}/);
  assert.doesNotMatch(service, /lib\/calculations/);
  assert.doesNotMatch(service, /createProposal/);
  assert.doesNotMatch(service, /updateProposal/);
  assert.doesNotMatch(service, /duplicateProposal/);
  assert.match(list, /Gerador de propostas removido/);
  assert.doesNotMatch(list, /Nova Proposta/);
});

test('privacidade e dados ficam unificados na aba Segurança', async () => {
  const [app, layout, settingsRoute, accountData] = await Promise.all([
    read(APP),
    read(LAYOUT),
    read(SETTINGS_ROUTE),
    read(ACCOUNT_DATA),
  ]);

  assert.match(app, /path="\/termos"/);
  assert.match(app, /path="\/privacidade"/);
  assert.match(app, /path="\/cancelamento-reembolso"/);
  assert.match(app, /path="privacidade-dados" element={<Navigate to="\/configuracoes\?tab=seguranca" replace \/>}/);
  assert.doesNotMatch(layout, /label: 'Privacidade e Dados'/);
  assert.match(settingsRoute, /activeTab === 'seguranca'/);
  assert.match(settingsRoute, /<AccountData embedded \/>/);
  assert.match(accountData, /embedded = false/);
  assert.match(accountData, /Documentos legais, exportação e exclusão completa agora fazem parte das configurações de segurança/);
  assert.match(app, /path="admin" element={<AdminDashboard \/>}/);
});
