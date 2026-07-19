import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  resolveCoverPaint,
  type CoverTheme,
} from '../src/features/design-pdf/engines/colorEngine';

const theme: CoverTheme = {
  current: {
    primary: '#112233',
    secondary: '#445566',
    accent: '#778899',
    neutral: '#243B53',
  },
  original: {
    primary: '#79ADD9',
    secondary: '#79ADD9',
    accent: '#F8B51F',
    neutral: '#D9D9D9',
  },
};

const cover12 = { isCover12: true };
const anotherCover = { isCover12: false };

test('capa 12 mantém #D9D9D9 fixo mesmo quando a paleta original o chama de neutro', () => {
  assert.equal(resolveCoverPaint('#D9D9D9', theme, cover12), null);
  assert.equal(resolveCoverPaint('#d9d9d9', theme, cover12), null);
});

test('capa 12 trata preto como a cor neutra da paleta', () => {
  assert.equal(resolveCoverPaint('#000000', theme, cover12), theme.current.neutral);
  assert.equal(resolveCoverPaint('#000', theme, cover12), theme.current.neutral);
  assert.equal(resolveCoverPaint('black', theme, cover12), theme.current.neutral);
});

test('regra especial não altera o comportamento das outras capas', () => {
  assert.equal(resolveCoverPaint('#D9D9D9', theme, anotherCover), theme.current.neutral);
  assert.equal(resolveCoverPaint('#000000', theme, anotherCover), null);
});

test('SVG original da capa 12 conserva o elemento estrutural cinza', async () => {
  const svg = await readFile(
    path.join(process.cwd(), 'public', 'pdf-assets', 'covers', 'A4 -12.svg'),
    'utf8',
  );

  assert.match(svg, /id="Subtract"[^>]*fill="#D9D9D9"/);
  assert.match(svg, /id="capa_12"/);
});
