import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const MIGRATION_PATH = 'supabase/migrations/20260720030000_billing_foundation.sql';
const LIMIT_ALIGNMENT_MIGRATION_PATH = 'supabase/migrations/20260720210000_align_plan_interval_limits.sql';
const SQL_TEST_PATH = 'supabase/tests/billing_foundation.sql';
const WORKFLOW_PATH = '.github/workflows/migrations-homologation.yml';
const BACKUP_SCRIPT_PATH = '.github/scripts/test-database-backup-restore.sh';
const MODEL_DOC_PATH = 'docs/BILLING_DATA_MODEL.md';

test('migration cria as quatro tabelas de cobrança com RLS', async () => {
  const migration = await readFile(MIGRATION_PATH, 'utf8');

  for (const table of ['billing_plans', 'subscriptions', 'billing_events', 'account_usage']) {
    assert.match(migration, new RegExp(`create table if not exists public\.${table}`));
    assert.match(migration, new RegExp(`alter table public\.${table} enable row level security`));
  }
});

test('catálogo persistido coincide com preços e limites comerciais por intervalo', async () => {
  const [foundation, alignment] = await Promise.all([
    readFile(MIGRATION_PATH, 'utf8'),
    readFile(LIMIT_ALIGNMENT_MIGRATION_PATH, 'utf8'),
  ]);

  assert.match(foundation, /\('free', 'Gratuito', 'BRL', 0, 0, 5, 1, 262144000/);
  assert.match(foundation, /\('pro', 'Pro', 'BRL', 10000, 100000/);
  assert.match(foundation, /monthly_price_cents bigint/);
  assert.match(foundation, /annual_price_cents bigint/);

  assert.match(alignment, /where code = 'free'/);
  assert.match(alignment, /proposals_per_month = 5/);
  assert.match(alignment, /annual_proposals_per_month = 5/);
  assert.match(alignment, /where code = 'pro'/);
  assert.match(alignment, /proposals_per_month = 30/);
  assert.match(alignment, /annual_proposals_per_month = 40/);
  assert.match(alignment, /resolve_plan_proposal_limit/);
});

test('uso mensal preserva o intervalo da assinatura para aplicar a cota correta', async () => {
  const alignment = await readFile(LIMIT_ALIGNMENT_MIGRATION_PATH, 'utf8');

  assert.match(alignment, /alter table public\.account_usage[\s\S]*add column if not exists billing_interval text/);
  assert.match(alignment, /account_usage_billing_interval_valid/);
  assert.match(alignment, /account_usage_plan_interval_consistent/);
  assert.match(alignment, /grant execute on function public\.resolve_plan_proposal_limit\(text, text\)[\s\S]*to service_role/);
  assert.doesNotMatch(alignment, /grant execute[^;]*to (?:anon|authenticated)/i);
});

test('contas novas e existentes recebem assinatura gratuita idempotente', async () => {
  const migration = await readFile(MIGRATION_PATH, 'utf8');

  assert.match(migration, /initialize_billing_account\(p_account_id uuid\)/);
  assert.match(migration, /on conflict \(account_id\) do nothing/);
  assert.match(migration, /initialize_billing_account_on_signup/);
  assert.match(migration, /after insert on auth\.users/);
  assert.match(migration, /for existing_user in select id from auth\.users loop/);
  assert.match(migration, /subscription\.initialized/);
});

test('frontend recebe somente leitura das próprias informações', async () => {
  const migration = await readFile(MIGRATION_PATH, 'utf8');

  assert.match(migration, /grant select on table public\.subscriptions\s+to authenticated/);
  assert.match(migration, /grant select on table public\.billing_events\s+to authenticated/);
  assert.match(migration, /grant select on table public\.account_usage\s+to authenticated/);
  assert.match(migration, /using \(auth\.uid\(\) = account_id\)/);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete)[^;]*to authenticated/i);
  assert.match(migration, /revoke execute on function public\.initialize_billing_account\(uuid\)/);
});

test('eventos possuem chave idempotente para o futuro webhook', async () => {
  const migration = await readFile(MIGRATION_PATH, 'utf8');

  assert.match(migration, /provider_event_id text/);
  assert.match(migration, /billing_events_provider_event_uidx/);
  assert.match(migration, /where provider is not null and provider_event_id is not null/);
  assert.match(migration, /metadata jsonb not null default '\{\}'::jsonb/);
});

test('homologação executa teste SQL e backup cobre os novos dados', async () => {
  const [sqlTest, workflow, backup] = await Promise.all([
    readFile(SQL_TEST_PATH, 'utf8'),
    readFile(WORKFLOW_PATH, 'utf8'),
    readFile(BACKUP_SCRIPT_PATH, 'utf8'),
  ]);

  assert.match(sqlTest, /Billing foundation test passed/);
  assert.match(sqlTest, /resolve_plan_proposal_limit\('pro', 'month'\) = 30/);
  assert.match(sqlTest, /resolve_plan_proposal_limit\('pro', 'year'\) = 40/);
  assert.match(sqlTest, /o usuário não vê exatamente a própria assinatura/);
  assert.match(workflow, /Testar fundação de cobrança e uso/);
  assert.match(workflow, /supabase\/tests\/billing_foundation\.sql/);

  for (const table of ['subscriptions', 'billing_events', 'account_usage']) {
    assert.match(backup, new RegExp(`--table=public\.${table}`));
  }

  assert.match(backup, /remover registros automáticos criados pelos gatilhos de auth/);
  assert.match(backup, /usage\.id = 'b1100000-0000-4000-8000-000000000003'/);
});

test('documentação separa modelo persistente de checkout e webhooks', async () => {
  const model = await readFile(MODEL_DOC_PATH, 'utf8');

  assert.match(model, /não integra um provedor de pagamentos/i);
  assert.match(model, /frontend não recebe escrita em nenhuma tabela de cobrança/);
  assert.match(model, /Payload bruto do provedor[\s\S]*nunca devem ser persistidos/);
  assert.match(model, /reservar a cota transacionalmente/);
});
