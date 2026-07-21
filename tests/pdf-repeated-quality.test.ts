import assert from 'node:assert/strict';
import test from 'node:test';
import { deflateSync } from 'node:zlib';
import React from 'react';
import { pdf } from '@react-pdf/renderer';

import { ProposalDocument } from '../src/components/pdf/ProposalDocument';
import {
  PDF_SIZE_LIMITS,
  assertPdfQuality,
  assertRepeatedPdfQuality,
  validatePdfBlob,
  type PdfQualityMetrics,
} from '../src/lib/pdf/pdfQuality';
import type { Proposal } from '../src/types/proposal';

function makeProposal(): Proposal {
  return {
    id: 'proposal-cover-1',
    user_id: 'user-cover-1',
    client_id: 'client-cover-1',
    code: 'PROP-CAPA-001',
    title: 'Proposta Comercial',
    status: 'pending',
    created_at: '2026-07-21T12:00:00.000Z',
    updated_at: '2026-07-21T12:00:00.000Z',
    client: {
      name: 'Cliente de Teste',
      city: 'São Paulo',
      state: 'SP',
    },
    profile: {
      company_name: 'SolAmigo Energia Solar',
      logo_url: null,
      default_validity_days: 7,
    },
    solar: {
      installed_power_kwp: 6.6,
    },
  } as Proposal;
}

function makeMetrics(overrides: Partial<PdfQualityMetrics> = {}): PdfQualityMetrics {
  return {
    byteLength: 100_000,
    pageCount: 2,
    objectCount: 20,
    streamCount: 8,
    fontCount: 2,
    imageCount: 1,
    hasPdfHeader: true,
    hasEofMarker: true,
    mimeType: 'application/pdf',
    ...overrides,
  };
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function makeDetailedCoverPng(width = 595, height = 842) {
  const bytesPerRow = 1 + width * 3;
  const pixels = Buffer.alloc(bytesPerRow * height);
  let state = 0x5a17c9e3;

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * bytesPerRow;
    pixels[rowOffset] = 0;
    for (let x = 1; x < bytesPerRow; x += 1) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      pixels[rowOffset + x] = state >>> 24;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(pixels, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  return `data:image/png;base64,${png.toString('base64')}`;
}

async function renderCover(proposal: Proposal, coverImage: string | null = null) {
  const document = React.createElement(ProposalDocument, {
    proposal,
    coverImage,
    pdfTheme: {
      primary: '#0A2249',
      secondary: '#C49133',
      accent: '#FACB5C',
      neutral: '#1F2A2A',
    },
  });

  return pdf(document).toBlob();
}

test('rejeita arquivo sem estrutura PDF antes do armazenamento', async () => {
  const invalidBlob = new Blob(['arquivo corrompido'], { type: 'application/pdf' });

  await assert.rejects(
    () => validatePdfBlob(invalidBlob),
    /cabeçalho PDF válido/,
  );
});

test('aceita pequenas diferenças de tamanho sem considerar perda de qualidade', () => {
  const reference = makeMetrics();
  const regenerated = makeMetrics({ byteLength: 103_500 });

  assert.doesNotThrow(() => assertRepeatedPdfQuality(reference, regenerated, 0.05));
});

test('detecta perda de páginas ou streams entre gerações', () => {
  const reference = makeMetrics();

  assert.throws(
    () => assertRepeatedPdfQuality(reference, makeMetrics({ pageCount: 1 })),
    /pageCount/,
  );
  assert.throws(
    () => assertRepeatedPdfQuality(reference, makeMetrics({ streamCount: 5 })),
    /streamCount/,
  );
});

test('política de tamanho define meta de 5 MiB e limite absoluto de 15 MiB', () => {
  assert.equal(PDF_SIZE_LIMITS.recommendedMaxBytes, 5 * 1024 * 1024);
  assert.equal(PDF_SIZE_LIMITS.hardMaxBytes, 15 * 1024 * 1024);
  assert.ok(PDF_SIZE_LIMITS.hardMaxBytes > PDF_SIZE_LIMITS.recommendedMaxBytes);
});

test('rejeita um PDF que ultrapassa o limite absoluto', () => {
  assert.throws(
    () => assertPdfQuality(
      makeMetrics({ byteLength: PDF_SIZE_LIMITS.hardMaxBytes + 1 }),
      { maxByteLength: PDF_SIZE_LIMITS.hardMaxBytes },
    ),
    /limite máximo/,
  );
});

test('PDF com capa rasterizada detalhada contém exatamente uma página', async () => {
  const blob = await renderCover(makeProposal(), makeDetailedCoverPng());
  const metrics = await validatePdfBlob(blob, {
    minByteLength: 4_096,
    maxByteLength: PDF_SIZE_LIMITS.hardMaxBytes,
    minPages: 1,
  });

  assert.equal(metrics.pageCount, 1);
  assert.ok(metrics.imageCount >= 1);
  assert.ok(metrics.byteLength <= PDF_SIZE_LIMITS.recommendedMaxBytes);
});

test('três gerações preservam a estrutura da capa única', async () => {
  const proposal = makeProposal();
  const proposalBeforeRendering = JSON.stringify(proposal);
  const generations: PdfQualityMetrics[] = [];

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const blob = await renderCover(proposal);
    const metrics = await validatePdfBlob(blob, {
      minByteLength: 4_096,
      maxByteLength: PDF_SIZE_LIMITS.hardMaxBytes,
      minPages: 1,
    });

    assert.equal(metrics.pageCount, 1);
    assert.equal(metrics.mimeType, 'application/pdf');
    assert.equal(metrics.hasPdfHeader, true);
    assert.equal(metrics.hasEofMarker, true);
    assert.ok(metrics.objectCount > 0);
    assert.ok(metrics.streamCount > 0);
    generations.push(metrics);
  }

  const [reference, ...repeated] = generations;
  for (const metrics of repeated) {
    assert.equal(metrics.pageCount, reference.pageCount);
    assert.equal(metrics.fontCount, reference.fontCount);
    assert.equal(metrics.imageCount, reference.imageCount);
  }

  assert.equal(JSON.stringify(proposal), proposalBeforeRendering);
});
