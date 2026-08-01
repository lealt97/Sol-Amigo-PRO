import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PAYBACK_LEGACY_STORAGE_KEY,
  buildPaybackScope,
  buildPaybackStorageKey,
  getPaybackProfilesForScope,
  setPaybackProfilesForScope,
  switchPaybackStorageScope,
} from '../src/lib/calculations/paybackProfileContext';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

test('isola o formulário temporário entre propostas do mesmo usuário', () => {
  const storage = new MemoryStorage();
  const proposalA = buildPaybackScope({
    userId: 'user-1',
    pathname: '/propostas/proposal-a/editar',
  });
  const proposalB = buildPaybackScope({
    userId: 'user-1',
    pathname: '/propostas/proposal-b/editar',
  });

  let activeScope = switchPaybackStorageScope(storage, null, proposalA);
  storage.setItem(PAYBACK_LEGACY_STORAGE_KEY, JSON.stringify({ proposalPrice: '25000' }));

  activeScope = switchPaybackStorageScope(storage, activeScope, proposalB);
  assert.equal(storage.getItem(PAYBACK_LEGACY_STORAGE_KEY), null);
  assert.match(storage.getItem(buildPaybackStorageKey(proposalA)) ?? '', /25000/);

  storage.setItem(PAYBACK_LEGACY_STORAGE_KEY, JSON.stringify({ proposalPrice: '41000' }));
  activeScope = switchPaybackStorageScope(storage, activeScope, proposalA);

  assert.match(storage.getItem(PAYBACK_LEGACY_STORAGE_KEY) ?? '', /25000/);
  assert.match(storage.getItem(buildPaybackStorageKey(proposalB)) ?? '', /41000/);
  assert.equal(activeScope, proposalA);
});

test('isola usuários diferentes mesmo quando a rota possui o mesmo formato', () => {
  const storage = new MemoryStorage();
  const path = '/propostas/nova';
  const userA = buildPaybackScope({ userId: 'user-a', pathname: path });
  const userB = buildPaybackScope({ userId: 'user-b', pathname: path });

  let activeScope = switchPaybackStorageScope(storage, null, userA);
  storage.setItem(PAYBACK_LEGACY_STORAGE_KEY, 'form-user-a');
  activeScope = switchPaybackStorageScope(storage, activeScope, userB);

  assert.equal(storage.getItem(PAYBACK_LEGACY_STORAGE_KEY), null);
  storage.setItem(PAYBACK_LEGACY_STORAGE_KEY, 'form-user-b');
  switchPaybackStorageScope(storage, activeScope, userA);

  assert.equal(storage.getItem(PAYBACK_LEGACY_STORAGE_KEY), 'form-user-a');
  assert.equal(storage.getItem(buildPaybackStorageKey(userB)), 'form-user-b');
});

test('não reaproveita automaticamente a chave antiga sem usuário ou proposta', () => {
  const storage = new MemoryStorage();
  storage.setItem(PAYBACK_LEGACY_STORAGE_KEY, 'ambiguous-form');

  switchPaybackStorageScope(
    storage,
    null,
    buildPaybackScope({ userId: 'user-1', pathname: '/propostas/proposal-a/editar' }),
  );

  assert.equal(storage.getItem(PAYBACK_LEGACY_STORAGE_KEY), null);
});

test('mantém perfis mensais isolados e devolve cópias defensivas', () => {
  const scopeA = 'user-a:/propostas/a';
  const scopeB = 'user-a:/propostas/b';
  const consumption = Array.from({ length: 12 }, (_, index) => 400 + index);
  const generation = Array.from({ length: 12 }, (_, index) => 500 + index);

  setPaybackProfilesForScope(scopeA, {
    monthlyCompensableConsumptionProfileKwh: consumption,
    monthlyGenerationProfileKwh: generation,
  });
  setPaybackProfilesForScope(scopeB, {
    monthlyCompensableConsumptionProfileKwh: null,
    monthlyGenerationProfileKwh: null,
  });

  consumption[0] = 9999;
  const storedA = getPaybackProfilesForScope(scopeA);
  storedA.monthlyGenerationProfileKwh![0] = 8888;

  assert.equal(getPaybackProfilesForScope(scopeA).monthlyCompensableConsumptionProfileKwh![0], 400);
  assert.equal(getPaybackProfilesForScope(scopeA).monthlyGenerationProfileKwh![0], 500);
  assert.deepEqual(getPaybackProfilesForScope(scopeB), {
    monthlyCompensableConsumptionProfileKwh: null,
    monthlyGenerationProfileKwh: null,
  });
});
