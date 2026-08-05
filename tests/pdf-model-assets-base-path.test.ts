import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

test('os modelos SVG do PDF respeitam o base path do deploy', async () => {
  const source = await readFile('src/services/pdfA4Presets.ts', 'utf8');

  assert.match(source, /import\.meta\.env\.BASE_URL/);
  assert.doesNotMatch(source, /['"`]\/pdf-assets\/covers\//);
});

test('os doze modelos SVG A4 estão presentes', async () => {
  const files = await readdir('public/pdf-assets/covers');
  const actual = files
    .filter((name) => /^A4 -(?:[1-9]|1[0-2])\.svg$/.test(name))
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  const expected = Array.from({ length: 12 }, (_, index) => `A4 -${index + 1}.svg`);

  assert.deepEqual(actual, expected);
});
