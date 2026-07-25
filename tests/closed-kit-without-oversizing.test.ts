import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const CATALOG = 'src/pages/kits/SolarKitCatalog.tsx';
const TYPES = 'src/types/solarKit.ts';
const LEGACY_TYPES = 'src/types/solar.ts';
const OPERATIONS = 'src/lib/kits/solarKitOperations.ts';

test('kit fechado é avaliado sem regra de oversizing ou limite DC/AC', async () => {
  const [calculator, catalog, types, legacyTypes, operations] = await Promise.all([
    readFile(CALCULATOR, 'utf8'),
    readFile(CATALOG, 'utf8'),
    readFile(TYPES, 'utf8'),
    readFile(LEGACY_TYPES, 'utf8'),
    readFile(OPERATIONS, 'utf8'),
  ]);

  assert.match(calculator, /Kit atende à potência calculada/);
  assert.match(calculator, /Compatibilidade elétrica/);
  assert.doesNotMatch(calculator, /calculateDcAcOversizing|selectedKitOversizing|evaluateInverterDcLimits|selectedKitInverterDcLimit/);
  assert.doesNotMatch(calculator, /oversizing|Relação DC\/AC|Configuração DC\/AC/i);
  assert.doesNotMatch(catalog, /Potência FV máxima kWp|Relação DC\/AC máxima|inverter_max_/);
  assert.doesNotMatch(types, /inverter_max_pv_power_kwp|inverter_max_dc_ac_ratio/);
  assert.doesNotMatch(legacyTypes, /oversizing/i);
  assert.doesNotMatch(operations, /inverter_max_pv_power_kwp|inverter_max_dc_ac_ratio/);
  assert.equal(existsSync('src/lib/calculations/oversizing.ts'), false);
  assert.equal(existsSync('src/lib/calculations/inverterDcLimits.ts'), false);
});
