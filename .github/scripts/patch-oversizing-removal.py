from pathlib import Path

path = Path('.github/scripts/remove-closed-kit-oversizing.py')
text = path.read_text(encoding='utf-8')

preview_needle = "calculator_path.write_text(calculator, encoding='utf-8')\n"
preview_insertion = """result_preview_block = \"\"\"                            {selectedKitOversizing && (\n                              <>\n                                <PreviewRow label=\"Relação DC/AC\" value={number.format(selectedKitOversizing.dcAcRatio)} />\n                                <PreviewRow label=\"Oversizing\" value={`${number.format(selectedKitOversizing.oversizingPercent)}%`} />\n                              </>\n                            )}\n\"\"\"\nif result_preview_block not in calculator:\n    raise SystemExit('Resumo final de oversizing não encontrado.')\ncalculator = calculator.replace(result_preview_block, '', 1)\ncalculator_path.write_text(calculator, encoding='utf-8')\n"""
if preview_insertion not in text:
    if preview_needle not in text:
        raise SystemExit('Ponto de inserção do resumo não encontrado no script principal.')
    text = text.replace(preview_needle, preview_insertion, 1)

test_marker = "(repo / 'tests/closed-kit-without-oversizing.test.ts').write_text(regression_test, encoding='utf-8')\n"
test_cleanup = """(repo / 'tests/closed-kit-without-oversizing.test.ts').write_text(regression_test, encoding='utf-8')\n\nfor old_test in (repo / 'tests').glob('*.test.ts'):\n    if old_test.name == 'closed-kit-without-oversizing.test.ts':\n        continue\n    content = old_test.read_text(encoding='utf-8')\n    if 'calculadora apresenta oversizing após a seleção do kit' in content:\n        old_test.unlink()\n"""
if test_cleanup not in text:
    if test_marker not in text:
        raise SystemExit('Ponto de limpeza dos testes não encontrado no script principal.')
    text = text.replace(test_marker, test_cleanup, 1)

path.write_text(text, encoding='utf-8')
