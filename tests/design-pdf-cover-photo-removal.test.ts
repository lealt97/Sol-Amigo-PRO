import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const IMAGE_EDITOR = 'src/features/design-pdf/components/ImageEditor.tsx';
const DESIGN_EDITOR = 'src/features/design-pdf/components/DesignPdfEditor.tsx';
const STORAGE_SERVICE = 'src/services/storageAssetService.ts';
const DESIGN_SERVICE = 'src/features/design-pdf/services/pdfDesignService.ts';

test('o botão de upload vira remover foto quando existe imagem de capa', async () => {
  const source = await readFile(IMAGE_EDITOR, 'utf8');

  assert.match(source, /const hasCoverImage = Boolean\(model\.cover_image_url\)/);
  assert.match(source, /hasCoverImage \? \(/);
  assert.match(source, /Remover foto/);
  assert.match(source, /Enviar foto da capa/);
  assert.match(source, /onCoverImageRemove/);
});

test('a remoção limpa o modelo, reseta o enquadramento e exclui o arquivo privado', async () => {
  const [editor, storage, service] = await Promise.all([
    readFile(DESIGN_EDITOR, 'utf8'),
    readFile(STORAGE_SERVICE, 'utf8'),
    readFile(DESIGN_SERVICE, 'utf8'),
  ]);

  assert.match(editor, /cover_image_url: null/);
  assert.match(editor, /cover_image_transform: resetCoverTransform/);
  assert.match(editor, /removeAsset\(coverImageUrl, 'pdf-assets', user\.id\)/);
  assert.match(storage, /const allowedPrefix = `\$\{userId\}\/models\/`/);
  assert.match(storage, /supabase\.storage\.from\(bucket\)\.remove/);
  assert.match(service, /removeAsset: storageAssetService\.removeAsset/);
});
