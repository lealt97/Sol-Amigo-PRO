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
