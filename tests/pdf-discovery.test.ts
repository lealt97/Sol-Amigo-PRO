import test from 'node:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

async function walk(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  }));
  return files.flat();
}

test('discover PDF generation and storage implementation', async () => {
  const files = (await walk('src')).filter((file) => /\.(ts|tsx)$/.test(file));
  const patterns = [
    '@react-pdf/renderer',
    'pdf_storage_path',
    'proposal-pdfs',
    "storage.from('proposal",
    'generatePdf',
    'generatePDF',
    'toBlob',
    '.upload(',
  ];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const matched = patterns.filter((pattern) => content.includes(pattern));
    if (matched.length > 0) {
      console.log(`PDF_DISCOVERY ${file} :: ${matched.join(', ')}`);
    }
  }
});
