from pathlib import Path

path = Path('.github/scripts/remove-closed-kit-oversizing.py')
text = path.read_text(encoding='utf-8')
needle = "calculator_path.write_text(calculator, encoding='utf-8')\n"
insertion = """result_preview_block = \"\"\"                            {selectedKitOversizing && (\n                              <>\n                                <PreviewRow label=\"Relação DC/AC\" value={number.format(selectedKitOversizing.dcAcRatio)} />\n                                <PreviewRow label=\"Oversizing\" value={`${number.format(selectedKitOversizing.oversizingPercent)}%`} />\n                              </>\n                            )}\n\"\"\"\nif result_preview_block not in calculator:\n    raise SystemExit('Resumo final de oversizing não encontrado.')\ncalculator = calculator.replace(result_preview_block, '', 1)\ncalculator_path.write_text(calculator, encoding='utf-8')\n"""
if insertion in text:
    raise SystemExit(0)
if needle not in text:
    raise SystemExit('Ponto de inserção não encontrado no script principal.')
path.write_text(text.replace(needle, insertion, 1), encoding='utf-8')
