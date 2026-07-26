import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const VIEW = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const MIGRATION = 'supabase/migrations/20260726010000_expand_proposals_flow_step_range.sql';

test('o banco aceita a oitava e última etapa do Wizard de propostas', async () => {
  const [view, migration] = await Promise.all([
    readFile(VIEW, 'utf8'),
    readFile(MIGRATION, 'utf8'),
  ]);

  const stepEntries = view.match(/\{ id: '[^']+', title: '[^']+' \}/g) ?? [];

  assert.equal(stepEntries.length, 8);
  assert.match(view, /flowStep: STEPS\.length - 1/);
  assert.match(migration, /flow_step >= 0 and flow_step <= 7/i);
});
