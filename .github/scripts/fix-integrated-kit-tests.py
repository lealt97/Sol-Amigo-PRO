from pathlib import Path

ROOT = Path('tests')

REPLACEMENTS = [
    (
        "id: 'irradiation'[\\s\\S]*id: 'modules', title: 'Telhado \\(opcional\\)'[\\s\\S]*id: 'kit', title: 'Kit de referência \\(opcional\\)'[\\s\\S]*id: 'payback'",
        "id: 'irradiation'[\\s\\S]*id: 'modules', title: 'Telhado \\(opcional\\)'[\\s\\S]*id: 'payback'",
    ),
    (
        "assert.match(calculator, /Kit de referência \\(opcional\\)/);",
        "assert.doesNotMatch(calculator, /id: 'kit'/);\n  assert.match(calculator, /Composição técnica da proposta/);",
    ),
    (
        "assert.match(payback, /Custo estimado preliminar do sistema/);",
        "assert.match(payback, /Custo estimado do sistema/);",
    ),
    (
        "currentStep === 5[\\s\\S]*<PaybackStep",
        "currentStep === 4[\\s\\S]*<PaybackStep",
    ),
    (
        "currentStep === 6[\\s\\S]*Resultado do dimensionamento",
        "currentStep === 5[\\s\\S]*Resultado do dimensionamento",
    ),
    (
        "if \\(currentStep === 5 && !paybackResult\\)",
        "if \\(currentStep === 4 && !paybackResult\\)",
    ),
]

changed = []
for path in ROOT.glob('*.test.ts'):
    source = path.read_text(encoding='utf-8')
    updated = source
    for old, new in REPLACEMENTS:
        updated = updated.replace(old, new)
    if updated != source:
        path.write_text(updated, encoding='utf-8')
        changed.append(str(path))

print('Adjusted legacy tests:', ', '.join(changed) if changed else 'none')
