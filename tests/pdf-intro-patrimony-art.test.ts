import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

test('a arte patrimonial substitui a ilustração genérica no resumo', async () => {
  const [asset, imageModule, engine, document, pages, preview, renderer] = await Promise.all([
    read('public/pdf-assets/illustrations/sua-energia-pode-trabalhar-a-favor-do-seu-patrimonio.svg'),
    read('src/assets/pdf-art/introPatrimonyImage.ts'),
    read('src/lib/pdf/utils/illustrationColorEngine.ts'),
    read('src/components/pdf/ProposalDocument.tsx'),
    read('src/components/pdf/sections/ProposalPages.tsx'),
    read('src/features/design-pdf/components/ProposalPagesPreviewWithVectorArt.tsx'),
    read('src/lib/pdf/renderProposalDocument.tsx'),
  ]);

  assert.match(asset, /<svg[^>]*viewBox="0 0 4777 3500"/);
  assert.match(asset, /#0076DD/i);
  assert.match(imageModule, /BASE_URL/);
  assert.match(engine, /intro: string/);
  assert.match(engine, /introPatrimonyImage/);
  assert.match(engine, /outputWidth: 2200/);
  assert.match(document, /illustration=\{illustrationImages\.intro\}/);
  assert.match(pages, /export function IntroPage\([\s\S]*illustration: string/);
  assert.match(pages, /<Image src=\{illustration\}/);
  assert.match(preview, /function IntroPreview/);
  assert.match(preview, /source=\{introPatrimonyImage\}/);
  assert.match(preview, /case 'intro': return <IntroPreview/);
  assert.match(renderer, /case 'intro'/);
  assert.match(renderer, /images\.intro/);
});
