import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  FREE_PLAN_LIMITS,
  GIBIBYTE,
  getPlanLimits,
  getRemainingQuota,
  getUsagePercent,
  hasQuotaForIncrement,
  MEBIBYTE,
  PLAN_USAGE_WARNING_PERCENT,
  PRO_ANNUAL_PLAN_LIMITS,
  PRO_MONTHLY_PLAN_LIMITS,
  shouldWarnAboutUsage,
} from '../src/lib/billing/planLimits';

const LIMITS_DOC_PATH = 'docs/PLAN_LIMITS.md';

test('plano gratuito possui limites pequenos e utilizáveis para avaliação', () => {
  assert.deepEqual(FREE_PLAN_LIMITS, {
    proposalsPerMonth: 5,
    users: 1,
    storageBytes: 250 * MEBIBYTE,
  });
  assert.equal(getPlanLimits('free', 'free'), FREE_PLAN_LIMITS);
});

test('Pro mensal e anual compartilham recursos, mas possuem cotas comerciais próprias', () => {
  assert.deepEqual(PRO_MONTHLY_PLAN_LIMITS, {
    proposalsPerMonth: 30,
    users: 5,
    storageBytes: 10 * GIBIBYTE,
  });
  assert.deepEqual(PRO_ANNUAL_PLAN_LIMITS, {
    proposalsPerMonth: 40,
    users: 5,
    storageBytes: 10 * GIBIBYTE,
  });
  assert.equal(getPlanLimits('pro', 'month'), PRO_MONTHLY_PLAN_LIMITS);
  assert.equal(getPlanLimits('pro', 'year'), PRO_ANNUAL_PLAN_LIMITS);
});

test('combinações inválidas de plano e intervalo são rejeitadas', () => {
  assert.throws(() => getPlanLimits('free', 'month'), RangeError);
  assert.throws(() => getPlanLimits('pro', 'free'), RangeError);
});

test('cálculo de saldo nunca retorna valor negativo', () => {
  assert.equal(getRemainingQuota(3, 5), 2);
  assert.equal(getRemainingQuota(5, 5), 0);
  assert.equal(getRemainingQuota(8, 5), 0);
});

test('incremento só é permitido quando cabe integralmente na cota', () => {
  assert.equal(hasQuotaForIncrement(4, 1, 5), true);
  assert.equal(hasQuotaForIncrement(5, 1, 5), false);
  assert.equal(hasQuotaForIncrement(240 * MEBIBYTE, 10 * MEBIBYTE, 250 * MEBIBYTE), true);
  assert.equal(hasQuotaForIncrement(245 * MEBIBYTE, 10 * MEBIBYTE, 250 * MEBIBYTE), false);
});

test('valores inválidos são rejeitados antes da decisão de cota', () => {
  assert.throws(() => getRemainingQuota(-1, 5), RangeError);
  assert.throws(() => getRemainingQuota(Number.NaN, 5), RangeError);
  assert.throws(() => getRemainingQuota(1, -5), RangeError);
  assert.throws(() => hasQuotaForIncrement(1, -1, 5), RangeError);
  assert.throws(() => getUsagePercent(-1, 5), RangeError);
  assert.throws(() => getUsagePercent(1, Number.NaN), RangeError);
});

test('aviso começa em 80% e percentual é limitado a 100%', () => {
  assert.equal(PLAN_USAGE_WARNING_PERCENT, 80);
  assert.equal(getUsagePercent(4, 5), 80);
  assert.equal(shouldWarnAboutUsage(3, 5), false);
  assert.equal(shouldWarnAboutUsage(4, 5), true);
  assert.equal(getUsagePercent(8, 5), 100);
});

test('documentação define contagem, intervalos, downgrade e preservação de dados', async () => {
  const limits = await readFile(LIMITS_DOC_PATH, 'utf8');

  assert.match(limits, /5 propostas\/mês, 1 usuário, 250 MiB/);
  assert.match(limits, /30 propostas\/mês, 5 usuários, 10 GiB/);
  assert.match(limits, /40 propostas\/mês, 5 usuários, 10 GiB/);
  assert.match(limits, /America\/Sao_Paulo/);
  assert.match(limits, /excluir uma proposta não devolve a unidade do mês/);
  assert.match(limits, /convites pendentes ainda válidos/);
  assert.match(limits, /nunca confia[r]? em tamanho informado pelo navegador/i);
  assert.match(limits, /nunca apaga dados automaticamente/);
  assert.match(limits, /Downgrade do Pro para o Gratuito/);
  assert.match(limits, /reservar a cota de forma transacional/);
});
