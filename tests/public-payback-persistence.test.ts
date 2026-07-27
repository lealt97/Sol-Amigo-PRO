import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const BASE_MIGRATION = 'supabase/migrations/20260726021500_sync_public_payback_calculation.sql';
const PAYBACK_MIGRATION = 'supabase/migrations/20260726130400_payback_engine.sql';
const PUBLIC_PROPOSAL = 'src/pages/public/PublicProposal.tsx';

test('propostas concluídas sincronizam o snapshot financeiro oficial para o link público', async () => {
  const [baseMigration, paybackMigration, publicProposal] = await Promise.all([
    readFile(BASE_MIGRATION, 'utf8'),
    readFile(PAYBACK_MIGRATION, 'utf8'),
    readFile(PUBLIC_PROPOSAL, 'utf8'),
  ]);

  assert.match(baseMigration, /solar_system_calculations_proposal_id_unique/);
  assert.match(baseMigration, /after insert or update of[\s\S]*flow_completed/i);

  assert.match(paybackMigration, /sync_proposal_solar_calculation/);
  assert.match(paybackMigration, /calculationSnapshot/);
  assert.match(paybackMigration, /calculation_version/);
  assert.match(paybackMigration, /discounted_payback_years/);
  assert.match(paybackMigration, /net_present_value/);
  assert.match(paybackMigration, /on conflict \(proposal_id\) do update/i);
  assert.match(paybackMigration, /payback_formatted/);
  assert.match(paybackMigration, /monthly_savings/);
  assert.match(paybackMigration, /revoke all on function public\.sync_proposal_solar_calculation\(uuid\)/);

  assert.match(publicProposal, /proposal\.solar\?\.payback_formatted/);
  assert.match(publicProposal, /proposal\.solar\?\.monthly_savings/);
});
