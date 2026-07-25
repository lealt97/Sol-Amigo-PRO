from pathlib import Path
import re
import subprocess

BASE = '9a96faefcc8087beb0450c4fa11fab794286bd5c'
repo = Path('.')

restore_paths = [
    'src/lib/kits/solarKitOperations.ts',
    'src/pages/kits/SolarKitCatalog.tsx',
    'src/pages/propostas/ProfessionalSizingCalculatorView.tsx',
    'src/types/solarKit.ts',
    'supabase-schema.sql',
    'tests/electrical-compatibility.test.ts',
    'tests/generation-input-only.test.ts',
    'tests/solarKitOperations.test.ts',
]
subprocess.run(['git', 'checkout', BASE, '--', *restore_paths], check=True)

for relative in [
    'src/lib/calculations/inverterDcLimits.ts',
    'src/lib/calculations/oversizing.ts',
    'supabase/migrations/20260724234906_add_inverter_manufacturer_dc_limits.sql',
    'tests/inverter-dc-limits.test.ts',
    'tests/oversizing.test.ts',
]:
    path = repo / relative
    if path.exists():
        path.unlink()

calculator_path = repo / 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx'
calculator = calculator_path.read_text(encoding='utf-8')

import_line = "import { calculateDcAcOversizing } from '../../lib/calculations/oversizing';\n"
if import_line not in calculator:
    raise SystemExit('Importação do cálculo de oversizing não encontrada.')
calculator = calculator.replace(import_line, '', 1)

memo_block = """  const selectedKitOversizing = useMemo(() => {
    const inverterPowerKw = selectedKit?.inverter_power_kw;
    if (!selectedKit || inverterPowerKw == null || inverterPowerKw <= 0) return null;

    try {
      return calculateDcAcOversizing(selectedKit.kit_power_kwp, inverterPowerKw);
    } catch {
      return null;
    }
  }, [selectedKit]);

"""
if memo_block not in calculator:
    raise SystemExit('Bloco selectedKitOversizing não encontrado.')
calculator = calculator.replace(memo_block, '', 1)

ui_pattern = re.compile(
    r'\n                    \{selectedKitOversizing \? \([\s\S]*?\n                    \)\}\n\n                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">',
)
calculator, count = ui_pattern.subn(
    '\n\n                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">',
    calculator,
    count=1,
)
if count != 1:
    raise SystemExit(f'Bloco visual de oversizing não removido corretamente: {count}.')
calculator_path.write_text(calculator, encoding='utf-8')

legacy_types_path = repo / 'src/types/solar.ts'
legacy_types = legacy_types_path.read_text(encoding='utf-8')
for line in [
    '  oversizing: number;\n',
    '  oversizing: number; // e.g. 1.20\n',
]:
    legacy_types = legacy_types.replace(line, '')
legacy_types_path.write_text(legacy_types, encoding='utf-8')

schema_path = repo / 'supabase-schema.sql'
schema = schema_path.read_text(encoding='utf-8')
schema = schema.replace('  oversizing NUMERIC DEFAULT 1.20,\n', '')
schema_path.write_text(schema, encoding='utf-8')

electrical_test_path = repo / 'tests/electrical-compatibility.test.ts'
electrical_test = electrical_test_path.read_text(encoding='utf-8')
old_assertion = "  assert.match(calculator, /A relação está acima da referência de 1,20[\\s\\S]*não bloqueia a compatibilidade do kit/);"
new_assertion = "  assert.doesNotMatch(calculator, /oversizing|Relação DC\\/AC|Configuração DC\\/AC/i);"
if old_assertion not in electrical_test:
    raise SystemExit('Expectativa antiga de oversizing não encontrada no teste elétrico.')
electrical_test = electrical_test.replace(old_assertion, new_assertion, 1)
electrical_test_path.write_text(electrical_test, encoding='utf-8')

regression_test = """import assert from 'node:assert/strict';
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
"""
(repo / 'tests/closed-kit-without-oversizing.test.ts').write_text(regression_test, encoding='utf-8')

residuals = []
for path in (repo / 'src').rglob('*'):
    if not path.is_file() or path.suffix not in {'.ts', '.tsx'}:
        continue
    for line_number, line in enumerate(path.read_text(encoding='utf-8').splitlines(), start=1):
        if re.search(r'oversizing|calculateDcAcOversizing|evaluateInverterDcLimits|inverter_max_dc_ac_ratio|inverter_max_pv_power_kwp', line, re.IGNORECASE):
            residuals.append(f'{path}:{line_number}: {line.strip()}')
if residuals:
    raise SystemExit('Referências residuais de oversizing:\n' + '\n'.join(residuals))
