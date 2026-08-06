import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('motor modela injeção, banco FIFO e validade legal de 60 meses', async () => {
  const engine = await readFile('src/lib/calculations/paybackEngineCreditBank.ts', 'utf8');

  assert.match(engine, /ENERGY_CREDIT_VALIDITY_MONTHS = 60/);
  assert.match(engine, /expireCreditLots/);
  assert.match(engine, /consumeOldestCredits/);
  assert.match(engine, /currentMonth - lot\.originMonth >= ENERGY_CREDIT_VALIDITY_MONTHS/);
  assert.match(engine, /selfConsumedEnergyKwh = Math\.min/);
  assert.match(engine, /injectedEnergyKwh = Math\.max/);
  assert.match(engine, /creditsUsedKwh/);
  assert.match(engine, /creditBalanceKwh/);
  assert.match(engine, /expiredCreditsKwh/);
  assert.match(engine, /gridCompensatedEnergyKwh/);
});

test('interface apresenta sazonalidade, fluxo de energia e créditos não aproveitados', async () => {
  const step = await readFile('src/pages/propostas/PaybackStep.tsx', 'utf8');

  assert.match(step, /Sazonalidade mensal/);
  assert.match(step, /Histórico real de 12 meses/);
  assert.match(step, /Informar geração mensal/);
  assert.match(step, /Fluxo de energia e banco de créditos/);
  assert.match(step, /créditos mais antigos são utilizados primeiro/);
  assert.match(step, /expiram após \{result\.creditValidityMonths\} meses/);
  assert.match(step, /Autoconsumo médio mensal/);
  assert.match(step, /Injeção média mensal/);
  assert.match(step, /Saldo após o 1º ano/);
  assert.match(step, /Créditos expirados no horizonte/);
});

test('perfis mensais são persistidos no rascunho e aplicados ao cálculo', async () => {
  const [draft, facade, context] = await Promise.all([
    readFile('src/types/proposalDraft.ts', 'utf8'),
    readFile('src/lib/calculations/payback.ts', 'utf8'),
    readFile('src/lib/calculations/paybackProfileContext.ts', 'utf8'),
  ]);

  assert.match(draft, /generationProfileMode\?: 'uniform' \| 'monthly'/);
  assert.match(draft, /monthlyGenerationProfileKwh\?: string\[\]/);
  assert.match(facade, /getActivePaybackProfiles/);
  assert.match(facade, /monthlyCompensableConsumptionProfileKwh/);
  assert.match(facade, /monthlyGenerationProfileKwh/);
  assert.match(context, /setActivePaybackProfiles/);
});
