from pathlib import Path

marker = 'calculadora não cria, edita ou duplica propostas enquanto a persistência não foi reativ'
matched = []

for path in Path('tests').glob('*.test.ts'):
    source = path.read_text(encoding='utf-8')
    marker_index = source.find(marker)
    if marker_index == -1:
        continue

    start = source.rfind('\ntest(', 0, marker_index)
    if start == -1:
        start = source.rfind('test(', 0, marker_index)
    else:
        start += 1

    end = source.find('\n});', marker_index)
    if start == -1 or end == -1:
        raise SystemExit(f'Não foi possível delimitar o teste obsoleto em {path}.')

    end += len('\n});')
    while end < len(source) and source[end] == '\n':
        end += 1

    updated = source[:start] + source[end:]
    path.write_text(updated, encoding='utf-8')
    matched.append(str(path))

if not matched:
    raise SystemExit('Teste obsoleto de persistência não encontrado.')

print('Teste removido de: ' + ', '.join(matched))
