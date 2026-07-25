import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { normalizeSolarKitPayload } from '../src/lib/kits/solarKitOperations';

test('normaliza as dimensões A x L cadastradas no kit', () => {
  const normalized = normalizeSolarKitPayload({
    name: 'Kit 5,5 kWp',
    module_power_w: 550,
    module_quantity: 10,
    module_height_m: 2.278,
    module_width_m: 1.134,
    cost_price: 12000,
    active: true,
  });

  assert.equal(normalized.module_height_m, 2.278);
  assert.equal(normalized.module_width_m, 1.134);
});

test('o catálogo exibe A x L dentro de Módulos Fotovoltaicos', async () => {
  const catalog = await readFile('src/pages/kits/SolarKitCatalog.tsx', 'utf8');

  assert.match(catalog, /Módulos Fotovoltaicos/);
  assert.match(catalog, /Altura \(A\) m \*/);
  assert.match(catalog, /Largura \(L\) m \*/);
  assert.match(catalog, /module_height_m/);
  assert.match(catalog, /module_width_m/);
});

test('a migração adiciona as dimensões dos módulos aos kits', async () => {
  const migration = await readFile('supabase/migrations/20260725210000_add_module_dimensions_to_solar_kits.sql', 'utf8');

  assert.match(migration, /module_height_m numeric/);
  assert.match(migration, /module_width_m numeric/);
  assert.match(migration, /module_height_m is null or module_height_m > 0/);
  assert.match(migration, /module_width_m is null or module_width_m > 0/);
});
