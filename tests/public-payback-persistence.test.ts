import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const MIGRATION = 'supabase/migrations/20260726021500_sync_public_payback_calculation.sql';
const PUBLIC_PROPOSAL = 'src/pages/public/PublicProposal.tsx';

test('propostas concluídas sincronizam potência, economia e payback para o link público', async () => {
  const [migration, publicProposal] = await Promise.all([
    readFile(MIGRATION, 'utf8'),
    readFile(PUBLIC_PROPOSAL, 'utf8'),
  ]);

  assert.match(migration, /solar_system_calculations_proposal_id_unique/);
  assert.match(migration, /sync_proposal_solar_calculation/);
  assert.match(migration, /after insert or update of[\s\S]*flow_completed/i);
  assert.match(migration, /on conflict \(proposal_id\) do update/i);
  assert.match(migration, /payback_formatted/);
  assert.match(migration, /monthly_savings/);

  assert.match(publicProposal, /proposal\.solar\?\.payback_formatted/);
  assert.match(publicProposal, /proposal\.solar\?\.monthly_savings/);
});
