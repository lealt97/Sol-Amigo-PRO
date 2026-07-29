from pathlib import Path
from textwrap import dedent

marker = Path('tests/preproposal-optional-technical.test.ts')
if marker.exists():
    print('Ajuste de pré-proposta já aplicado; nenhuma alteração necessária.')
    raise SystemExit(0)

workflow_path = Path('.github/workflows/one-off-preproposal-optional-technical.yml')
source = workflow_path.read_text()
start_marker = "          python <<'PY'\n"
end_marker = "\n          PY\n"
start = source.index(start_marker) + len(start_marker)
end = source.index(end_marker, start)
script = dedent(source[start:end])
exec(compile(script, str(workflow_path), 'exec'), {'__name__': '__main__'})

p2_path = Path('tests/p2-launch-readiness.test.ts')
p2 = p2_path.read_text()
block_start = p2.index("test('dimensionamento começa pelo cliente")
block_end = p2.index("\ntest('privacidade e exportação", block_start)
new_block = """test('dimensionamento comercial mantém o contrato da pré-proposta', async () => {
  const [calculator, roofEditor, payback, engine, consumptionEngine] = await Promise.all([
    read(SIZING_CALCULATOR),
    read(ROOF_EDITOR),
    read('src/pages/propostas/PaybackStep.tsx'),
    read(SIZING_ENGINE),
    read(CONSUMPTION_ENGINE),
  ]);

  assert.match(calculator, /Selecione o cliente/);
  assert.match(calculator, /Consumo médio direto/);
  assert.match(calculator, /Histórico de 12 meses/);
  assert.match(calculator, /Levantamento de cargas/);
  assert.match(calculator, /Telhado \\(opcional\\)/);
  assert.match(calculator, /Kit de referência \\(opcional\\)/);
  assert.match(calculator, /hasRoofTechnicalData && !roofOrientationResult/);
  assert.doesNotMatch(calculator, /toast\\.error\\('Selecione um kit on-grid cadastrado\\.'/);
  assert.match(roofEditor, /Latitude da instalação \\(opcional\\)/);
  assert.match(roofEditor, /Área útil \\(opcional\\)/);
  assert.match(payback, /selectedKit: SolarKit \\| null/);
  assert.match(payback, /Custo estimado preliminar do sistema/);
  assert.match(consumptionEngine, /resolveAverageMonthlyConsumptionKwh/);
  assert.match(engine, /requiredPowerKwp/);
  assert.match(engine, /selectedKitPowerKwp/);
});
"""
p2_path.write_text(p2[:block_start] + new_block + p2[block_end:])
