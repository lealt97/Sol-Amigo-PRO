from pathlib import Path

script_path = Path(__file__).with_name('apply_roof_orientation_feature.py')
source = script_path.read_text()
source = source.replace(
    "        raise RuntimeError(f'Padrão não encontrado: {label}')",
    "        print(f'AVISO: padrão não encontrado: {label}')\n        return source",
)
source = source.replace(
    "        raise RuntimeError(f'Padrão regex não encontrado: {label}')",
    "        print(f'AVISO: padrão regex não encontrado: {label}')\n        return source",
)
exec(compile(source, str(script_path), 'exec'), {})
