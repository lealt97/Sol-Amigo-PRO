import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const IMAGE_EDITOR = 'src/features/design-pdf/components/ImageEditor.tsx';

test('o editor de PDF oferece atalho permanente para cadastrar e gerenciar logos', async () => {
  const source = await readFile(IMAGE_EDITOR, 'utf8');

  assert.match(source, /to="\/configuracoes\?tab=logo"/);
  assert.match(source, /Gerenciar logos da conta/);
  assert.match(source, /Configurações da Conta &gt; Logo/);
});
