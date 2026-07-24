import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  createSolarKitOperations,
  filterSolarKits,
  normalizeSolarKitPayload,
  recommendSolarKit,
  type SolarKitRepository,
} from '../src/lib/kits/solarKitOperations';
import {
  buildSolarKitSnapshot,
  type SolarKit,
  type SolarKitFormValues,
} from '../src/types/solarKit';

const baseForm: SolarKitFormValues = {
  name: 'Kit On-grid 5 kWp',
  supplier: 'Distribuidor Solar',
  system_type: 'on_grid',
  module_brand: 'Marca Solar',
  module_model: 'MS-550',
  module_power_w: 550,
  module_quantity: 10,
  inverter_brand: 'Inversores SA',
  inverter_model: 'INV-5K',
  inverter_power_kw: 5,
  inverter_max_pv_power_kwp: 7.5,
  inverter_max_dc_ac_ratio: 1.5,
  grid_connection_type: 'biphase',
  grid_voltage_v: 220,
  structure_type: 'Telhado cerâmico',
  battery_brand: 'Bateria indevida',
  battery_model: 'BAT-10',
  battery_capacity_kwh: 10,
  usable_battery_capacity_kwh: 8,
  battery_quantity: 1,
  backup_power_kw: 4,
  autonomy_hours: 6,
  essential_loads_description: 'Geladeira e iluminação',
  cost_price: 12000,
  sale_price: 18000,
  active: true,
  notes: 'Kit de teste',
};

function makeKit(overrides: Partial<SolarKit> = {}): SolarKit {
  return {
    id: 'kit-1',
    user_id: 'user-owner',
    name: 'Kit On-grid 5 kWp',
    supplier: 'Distribuidor Solar',
    system_type: 'on_grid',
    module_brand: 'Marca Solar',
    module_model: 'MS-550',
    module_power_w: 550,
    module_quantity: 10,
    inverter_brand: 'Inversores SA',
    inverter_model: 'INV-5K',
    inverter_power_kw: 5,
    inverter_max_pv_power_kwp: 7.5,
    inverter_max_dc_ac_ratio: 1.5,
    grid_connection_type: 'biphase',
    grid_voltage_v: 220,
    structure_type: 'Telhado cerâmico',
    battery_brand: null,
    battery_model: null,
    battery_capacity_kwh: null,
    usable_battery_capacity_kwh: null,
    battery_quantity: null,
    backup_power_kw: null,
    autonomy_hours: null,
    essential_loads_description: null,
    kit_power_kwp: 5.5,
    cost_price: 12000,
    sale_price: 18000,
    active: true,
    notes: 'Kit de teste',
    created_at: '2026-07-18T00:00:00.000Z',
    updated_at: '2026-07-18T00:00:00.000Z',
    ...overrides,
  };
}

function createRepository(overrides: Partial<SolarKitRepository> = {}): SolarKitRepository {
  return {
    list: async () => [],
    listActive: async () => [],
    insert: async (values) => makeKit({
      user_id: values.user_id,
      name: values.name,
      system_type: values.system_type,
      module_power_w: values.module_power_w,
      module_quantity: values.module_quantity,
      cost_price: values.cost_price,
      sale_price: values.sale_price,
      active: values.active,
    }),
    update: async (id, values) => makeKit({
      id,
      name: values.name,
      system_type: values.system_type,
      module_power_w: values.module_power_w,
      module_quantity: values.module_quantity,
      cost_price: values.cost_price,
      sale_price: values.sale_price,
      active: values.active,
    }),
    remove: async () => undefined,
    setActive: async (id, active) => makeKit({ id, active }),
    ...overrides,
  };
}

test('normaliza textos, números e remove bateria de kits on-grid', () => {
  const normalized = normalizeSolarKitPayload({
    ...baseForm,
    name: '  Kit On-grid 5 kWp  ',
    supplier: '  Distribuidor Solar  ',
    notes: '  Observação  ',
  });

  assert.equal(normalized.name, 'Kit On-grid 5 kWp');
  assert.equal(normalized.supplier, 'Distribuidor Solar');
  assert.equal(normalized.notes, 'Observação');
  assert.equal(normalized.module_power_w, 550);
  assert.equal(normalized.module_quantity, 10);
  assert.equal(normalized.grid_connection_type, 'biphase');
  assert.equal(normalized.grid_voltage_v, 220);
  assert.equal(normalized.inverter_max_pv_power_kwp, 7.5);
  assert.equal(normalized.inverter_max_dc_ac_ratio, 1.5);
  assert.equal(normalized.battery_brand, null);
  assert.equal(normalized.battery_capacity_kwh, null);
  assert.equal(normalized.autonomy_hours, null);
});

test('preserva dados de armazenamento em kits híbridos e off-grid', () => {
  const hybrid = normalizeSolarKitPayload({
    ...baseForm,
    system_type: 'hybrid',
    battery_brand: '  Bateria Solar  ',
  });

  assert.equal(hybrid.system_type, 'hybrid');
  assert.equal(hybrid.battery_brand, 'Bateria Solar');
  assert.equal(hybrid.battery_capacity_kwh, 10);
  assert.equal(hybrid.usable_battery_capacity_kwh, 8);
  assert.equal(hybrid.backup_power_kw, 4);
  assert.equal(hybrid.autonomy_hours, 6);
});

test('cadastra kit vinculado ao usuário autenticado', async () => {
  let receivedUserId = '';
  let receivedName = '';
  const operations = createSolarKitOperations(createRepository({
    insert: async (values) => {
      receivedUserId = values.user_id;
      receivedName = values.name;
      return makeKit({ user_id: values.user_id, name: values.name });
    },
  }));

  const created = await operations.createKit(baseForm, 'user-123');

  assert.equal(receivedUserId, 'user-123');
  assert.equal(receivedName, 'Kit On-grid 5 kWp');
  assert.equal(created.user_id, 'user-123');
});

test('edita o kit correto com payload normalizado', async () => {
  let receivedId = '';
  let receivedName = '';
  const operations = createSolarKitOperations(createRepository({
    update: async (id, values) => {
      receivedId = id;
      receivedName = values.name;
      return makeKit({ id, name: values.name });
    },
  }));

  const updated = await operations.updateKit('kit-77', {
    ...baseForm,
    name: '  Kit Atualizado  ',
  });

  assert.equal(receivedId, 'kit-77');
  assert.equal(receivedName, 'Kit Atualizado');
  assert.equal(updated.name, 'Kit Atualizado');
});

test('duplica o kit com novo nome e novo proprietário', async () => {
  let receivedName = '';
  let receivedUserId = '';
  const operations = createSolarKitOperations(createRepository({
    insert: async (values) => {
      receivedName = values.name;
      receivedUserId = values.user_id;
      return makeKit({
        id: 'kit-copy',
        name: values.name,
        user_id: values.user_id,
      });
    },
  }));

  const copy = await operations.duplicateKit(makeKit(), 'user-copy');

  assert.equal(receivedName, 'Kit On-grid 5 kWp (cópia)');
  assert.equal(receivedUserId, 'user-copy');
  assert.equal(copy.id, 'kit-copy');
});

test('altera o status e exclui somente o kit solicitado', async () => {
  const calls: string[] = [];
  const operations = createSolarKitOperations(createRepository({
    setActive: async (id, active) => {
      calls.push(`status:${id}:${active}`);
      return makeKit({ id, active });
    },
    remove: async (id) => {
      calls.push(`delete:${id}`);
    },
  }));

  const disabled = await operations.toggleKitStatus('kit-2', false);
  await operations.deleteKit('kit-2');

  assert.equal(disabled.active, false);
  assert.deepEqual(calls, ['status:kit-2:false', 'delete:kit-2']);
});

test('lista kits cadastrados e somente os ativos', async () => {
  const allKits = [makeKit(), makeKit({ id: 'kit-2', active: false })];
  const activeKits = allKits.filter((kit) => kit.active);
  const operations = createSolarKitOperations(createRepository({
    list: async () => allKits,
    listActive: async () => activeKits,
  }));

  assert.equal((await operations.getKits()).length, 2);
  assert.deepEqual((await operations.getActiveKits()).map((kit) => kit.id), ['kit-1']);
});

test('recomenda o menor kit ativo e compatível que atende a potência', () => {
  const kits = [
    makeKit({ id: 'small', kit_power_kwp: 3.3 }),
    makeKit({ id: 'ideal', kit_power_kwp: 5.5 }),
    makeKit({ id: 'large', kit_power_kwp: 8.8 }),
    makeKit({ id: 'inactive', kit_power_kwp: 4.4, active: false }),
    makeKit({ id: 'hybrid', kit_power_kwp: 5, system_type: 'hybrid' }),
  ];

  assert.equal(recommendSolarKit(kits, 4.2, 'on_grid')?.id, 'ideal');
  assert.equal(recommendSolarKit(kits, 12, 'on_grid')?.id, 'large');
  assert.equal(recommendSolarKit(kits, 4.2, 'hybrid')?.id, 'hybrid');
  assert.equal(recommendSolarKit(kits, 0, 'on_grid'), null);
});

test('filtra kits pelos principais campos do catálogo', () => {
  const kits = [
    makeKit(),
    makeKit({
      id: 'kit-2',
      name: 'Kit Híbrido Premium',
      supplier: 'Fornecedor Horizonte',
      system_type: 'hybrid',
      battery_brand: 'PowerCell',
    }),
  ];

  assert.deepEqual(filterSolarKits(kits, 'horizonte').map((kit) => kit.id), ['kit-2']);
  assert.deepEqual(filterSolarKits(kits, 'POWERCELL').map((kit) => kit.id), ['kit-2']);
  assert.equal(filterSolarKits(kits, '').length, 2);
});

test('cria snapshot imutável com os dados comerciais e técnicos do kit', () => {
  const kit = makeKit({
    system_type: 'hybrid',
    battery_brand: 'PowerCell',
    battery_capacity_kwh: 10,
    usable_battery_capacity_kwh: 8,
  });
  const snapshot = buildSolarKitSnapshot(kit);

  assert.equal(snapshot.id, kit.id);
  assert.equal(snapshot.name, kit.name);
  assert.equal(snapshot.system_type, 'hybrid');
  assert.equal(snapshot.grid_connection_type, 'biphase');
  assert.equal(snapshot.grid_voltage_v, 220);
  assert.equal(snapshot.inverter_max_pv_power_kwp, 7.5);
  assert.equal(snapshot.inverter_max_dc_ac_ratio, 1.5);
  assert.equal(snapshot.battery_capacity_kwh, 10);
  assert.equal(snapshot.cost_price, 12000);
  assert.equal('user_id' in snapshot, false);
  assert.equal('active' in snapshot, false);
  assert.equal('notes' in snapshot, false);

  kit.name = 'Nome alterado depois da proposta';
  kit.cost_price = 99999;
  assert.equal(snapshot.name, 'Kit On-grid 5 kWp');
  assert.equal(snapshot.cost_price, 12000);
});

test('propaga falhas do repositório ao cadastrar e excluir', async () => {
  const createError = new Error('Falha ao cadastrar kit');
  const deleteError = new Error('Falha ao excluir kit');
  const operations = createSolarKitOperations(createRepository({
    insert: async () => Promise.reject(createError),
    remove: async () => Promise.reject(deleteError),
  }));

  await assert.rejects(() => operations.createKit(baseForm, 'user-1'), createError);
  await assert.rejects(() => operations.deleteKit('kit-1'), deleteError);
});
