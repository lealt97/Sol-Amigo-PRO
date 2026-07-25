import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildPublicProposalUrl,
  buildQrCodeImageUrl,
  buildWhatsAppShareUrl,
  normalizeWhatsAppPhone,
} from '../src/lib/proposals/delivery';

const DETAILS = 'src/pages/propostas/ProposalDetails.tsx';
const PANEL = 'src/components/proposals/ProposalDeliveryPanel.tsx';
const PDF_GENERATOR = 'src/lib/pdf/generateProposalPdf.tsx';
const PUBLIC_PAGE = 'src/pages/public/PublicProposal.tsx';

test('normaliza telefone brasileiro e cria links de entrega', () => {
  assert.equal(normalizeWhatsAppPhone('(11) 98765-4321'), '5511987654321');
  assert.equal(normalizeWhatsAppPhone('+55 11 98765-4321'), '5511987654321');
  assert.equal(
    buildPublicProposalUrl('token seguro', 'https://app.exemplo.com/'),
    'https://app.exemplo.com/proposta/token%20seguro',
  );

  const whatsapp = buildWhatsAppShareUrl({
    phone: '(11) 98765-4321',
    clientName: 'Ana',
    proposalTitle: 'Residência Ana',
    publicUrl: 'https://app.exemplo.com/proposta/abc',
  });
  assert.match(whatsapp, /^https:\/\/wa\.me\/5511987654321\?text=/);
  assert.match(decodeURIComponent(whatsapp), /aceitar ou recusar/);

  const qrCode = buildQrCodeImageUrl('https://app.exemplo.com/proposta/abc');
  assert.match(qrCode, /^https:\/\/api\.qrserver\.com\/v1\/create-qr-code\//);
  assert.match(qrCode, /data=https%3A%2F%2Fapp\.exemplo\.com%2Fproposta%2Fabc/);
});

test('etapa final integra modelos, PDF, WhatsApp, link e QR Code', async () => {
  const [details, panel, generator, publicPage] = await Promise.all([
    readFile(DETAILS, 'utf8'),
    readFile(PANEL, 'utf8'),
    readFile(PDF_GENERATOR, 'utf8'),
    readFile(PUBLIC_PAGE, 'utf8'),
  ]);

  assert.match(details, /Etapa final da proposta/);
  assert.match(details, /<ProposalDeliveryPanel/);
  assert.match(panel, /pdfModelService\.getUserModels/);
  assert.match(panel, /model\.is_default/);
  assert.match(panel, /generateAndUploadPdf\(workingProposal, selectedModelId \|\| null\)/);
  assert.match(panel, /buildWhatsAppShareUrl/);
  assert.match(panel, /buildQrCodeImageUrl/);
  assert.match(panel, /Link público com aceite e recusa/);
  assert.match(generator, /selectedModelId\?: string \| null/);
  assert.match(publicPage, /Aceitar Proposta/);
  assert.match(publicPage, /Recusar Proposta/);
});
