from pathlib import Path

path = Path('tests/p2-launch-readiness.test.ts')
text = path.read_text(encoding='utf-8')
old = "  assert.match(calculator, /Tipo de ligação/);"
new = "  assert.match(calculator, /Padrão elétrico da unidade/);"
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('Expectativa antiga do tipo de ligação não encontrada.')
path.write_text(text, encoding='utf-8')
