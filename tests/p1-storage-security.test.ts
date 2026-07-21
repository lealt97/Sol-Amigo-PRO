import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const MIGRATION_PATH = 'supabase/migrations/20260720223000_p1_private_assets_upload_limits.sql';
const STORAGE_REFERENCE_PATH = 'src/lib/storage/privateAsset.ts';
const STORAGE_SERVICE_PATH = 'src/services/storageAssetService.ts';
const PDF_GENERATOR_PATH = 'src/lib/pdf/generateProposalPdf.tsx';
const PDF_PREVIEW_PATH = 'src/features/design-pdf/components/PdfPreview.tsx';
const APP_PATH = 'src/App.tsx';

const read = (path: string) => readFile(path, 'utf8');

test('Storage aplica limites reais de tamanho e MIME no servidor', async () => {
  const migration = await read(MIGRATION_PATH);

  assert.match(migration, /'pdf-assets'[\s\S]*false[\s\S]*8388608[\s\S]*image\/jpeg[\s\S]*image\/png[\s\S]*image\/webp/);
  assert.match(migration, /'proposals'[\s\S]*false[\s\S]*15728640[\s\S]*application\/pdf/);
  assert.match(migration, /'logos'[\s\S]*5242880[\s\S]*image\/svg\+xml/);
  assert.match(migration, /allowed_mime_types = excluded\.allowed_mime_types/);
});

test('imagens de capa deixam de ter leitura pública e usam acesso do proprietário', async () => {
  const migration = await read(MIGRATION_PATH);

  assert.match(migration, /drop policy if exists "Public read pdf-assets"/);
  assert.match(migration, /create policy "Owner read pdf-assets"/);
  assert.match(migration, /bucket_id = 'pdf-assets'[\s\S]*storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
  assert.match(migration, /storage:\/\/pdf-assets\//);
  assert.match(migration, /storage:\/\/proposals\//);
});

test('cliente persiste referência estável e cria URL assinada somente para uso temporário', async () => {
  const [referenceSource, serviceSource, previewSource] = await Promise.all([
    read(STORAGE_REFERENCE_PATH),
    read(STORAGE_SERVICE_PATH),
    read(PDF_PREVIEW_PATH),
  ]);

  assert.match(referenceSource, /STORAGE_REFERENCE_PREFIX = 'storage:\/\/'/);
  assert.match(referenceSource, /createSignedUrl\(reference\.path, expiresIn\)/);
  assert.match(referenceSource, /PRIVATE_IMAGE_MAX_BYTES = 8 \* 1024 \* 1024/);
  assert.match(serviceSource, /return createStorageReference\(bucket, filePath\)/);
  assert.match(serviceSource, /uploadRoofImage/);
  assert.match(previewSource, /resolveAssetUrl\(model\.cover_image_url, 900\)/);
});

test('geração de PDF falha fechada sem restaurar URL pública', async () => {
  const pdfGenerator = await read(PDF_GENERATOR_PATH);

  assert.match(pdfGenerator, /pdf_storage_path: input\.storagePath/);
  assert.match(pdfGenerator, /O arquivo público não será usado como alternativa/);
  assert.doesNotMatch(pdfGenerator, /getPublicUrl\(input\.storagePath\)/);
  assert.doesNotMatch(pdfGenerator, /fallbackUrl/);
  assert.match(pdfGenerator, /resolveStorageAssetUrl\(privateRoofImage, 900\)/);
});

test('upload de telhado não está mais exposto pelo Wizard removido', async () => {
  const [service, app] = await Promise.all([
    read(STORAGE_SERVICE_PATH),
    read(APP_PATH),
  ]);

  assert.match(service, /uploadRoofImage/);
  assert.doesNotMatch(app, /ProposalWizard/);
  assert.match(app, /path="propostas\/nova" element=\{null\}/);
});
