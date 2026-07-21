import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const MIGRATION_PATH = 'supabase/migrations/20260720224500_p1_proposal_quota_enforcement.sql';
const PROPOSAL_SERVICE_PATH = 'src/services/proposalService.ts';
const APP_PATH = 'src/App.tsx';

const read = (path: string) => readFile(path, 'utf8');

test('a proteção de cota histórica permanece no servidor', async () => {
  const migration = await read(MIGRATION_PATH);

  assert.match(migration, /create or replace function public\.reserve_proposal_quota\(\)/);
  assert.match(migration, /before insert on public\.proposals/);
  assert.match(migration, /for each row execute function public\.reserve_proposal_quota\(\)/);
  assert.match(migration, /for update/);
  assert.match(migration, /proposals_created = usage\.proposals_created \+ 1/);
});

test('limite efetivo usa plano, intervalo e tolerância de pagamento no servidor', async () => {
  const migration = await read(MIGRATION_PATH);

  assert.match(migration, /resolve_plan_proposal_limit\(v_plan_code, v_billing_interval\)/);
  assert.match(migration, /status in \('active', 'trialing'\)/);
  assert.match(migration, /status = 'past_due'[\s\S]*grace_period_ends_at > now\(\)/);
  assert.match(migration, /v_plan_code := 'free'/);
  assert.match(migration, /v_used >= v_limit/);
  assert.match(migration, /Limite mensal de propostas atingido/);
});

test('exclusão não devolve uso contabilizado', async () => {
  const migration = await read(MIGRATION_PATH);

  assert.doesNotMatch(migration, /before delete on public\.proposals/);
  assert.doesNotMatch(migration, /proposals_created\s*=\s*usage\.proposals_created\s*-\s*1/);
});

test('frontend não cria, edita ou duplica propostas após remoção do Wizard', async () => {
  const [service, app] = await Promise.all([
    read(PROPOSAL_SERVICE_PATH),
    read(APP_PATH),
  ]);

  assert.doesNotMatch(service, /save_proposal_bundle/);
  assert.doesNotMatch(service, /createProposal/);
  assert.doesNotMatch(service, /updateProposal/);
  assert.doesNotMatch(service, /duplicateProposal/);
  assert.doesNotMatch(service, /\.insert\(/);
  assert.match(app, /path="propostas\/nova" element={<Navigate to="\/propostas" replace \/>}/);
  assert.match(app, /path="propostas\/:id\/editar" element={<Navigate to="\/propostas" replace \/>}/);
});

test('usuário autenticado pode consultar somente a própria cota histórica', async () => {
  const migration = await read(MIGRATION_PATH);

  assert.match(migration, /create or replace function public\.get_my_proposal_quota\(\)/);
  assert.match(migration, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(migration, /grant execute on function public\.get_my_proposal_quota\(\)[\s\S]*to authenticated/);
  assert.match(migration, /'remaining'/);
  assert.match(migration, /'warning'/);
});
