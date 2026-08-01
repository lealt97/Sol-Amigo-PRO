from pathlib import Path
import re

ROOT = Path('tests')

PLAIN_REPLACEMENTS = [
    (
        "assert.match(calculator, /Kit de referência \\(opcional\\)/);",
        "assert.doesNotMatch(calculator, /id: 'kit'/);\n  assert.match(calculator, /Composição técnica da proposta/);",
    ),
    (
        "assert.match(calculator, /Kit solar de referência — opcional/);",
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
remaining_legacy_occurrences = []
wizard_regex_files = []

for path in ROOT.rglob('*.test.ts'):
    source = path.read_text(encoding='utf-8')
    updated = source

    for old, new in PLAIN_REPLACEMENTS:
        updated = updated.replace(old, new)

    updated = re.sub(
        r"id: 'kit'.{0,260}?\[\\s\\S\]\*id: 'payback'",
        "id: 'payback'",
        updated,
        flags=re.DOTALL,
    )

    if updated != source:
        path.write_text(updated, encoding='utf-8')
        changed.append(str(path))

    for line_number, line in enumerate(updated.splitlines(), start=1):
        if "id: 'kit'" in line and 'doesNotMatch' not in line:
            remaining_legacy_occurrences.append(f'{path}:{line_number}: {line.strip()}')
        if "id: 'irradiation'" in line:
            wizard_regex_files.append(f'{path}:{line_number}')

print('Adjusted legacy tests:', ', '.join(changed) if changed else 'none')
if remaining_legacy_occurrences:
    print('Remaining standalone-kit expectations:')
    print('\n'.join(remaining_legacy_occurrences))

if wizard_regex_files:
    raise RuntimeError('Wizard regex files: ' + ', '.join(wizard_regex_files))
