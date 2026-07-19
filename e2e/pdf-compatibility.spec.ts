import { expect, test } from '@playwright/test';

const PUBLIC_TOKEN = 'abcdef1234567890abcdef1234567890';
const PDF_PATH = '/e2e/proposta-compatibilidade.pdf';

function publicProposalPayload() {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    code: 'PROP-PDF-COMPAT',
    title: 'Proposta Fotovoltaica para Compatibilidade',
    status: 'viewed',
    created_at: '2026-07-19T00:00:00.000Z',
    final_price: 32890,
    pdf_available: true,
    client: {
      name: 'Cliente Compatibilidade Multiplataforma',
      city: 'Belo Horizonte',
      state: 'MG',
    },
    company: {
      name: 'SolAmigo Energia Solar',
      logo_url: null,
    },
    solar: {
      installed_power_kwp: 8.25,
      monthly_savings: 965,
      payback_formatted: '3 anos e 5 meses',
    },
    solar_kit_snapshot: {
      name: 'Kit Solar Compatibilidade',
      kit_power_kwp: 8.25,
      module_quantity: 15,
      module_power_w: 550,
      inverter_power_kw: 8,
      supplier: 'Fornecedor Teste',
    },
  };
}

function minimalPdf(): Buffer {
  return Buffer.from([
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    'endobj',
    '3 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>',
    'endobj',
    '4 0 obj',
    '<< /Length 0 >>',
    'stream',
    '',
    'endstream',
    'endobj',
    'xref',
    '0 5',
    '0000000000 65535 f ',
    'trailer',
    '<< /Root 1 0 R /Size 5 >>',
    'startxref',
    '0',
    '%%EOF',
  ].join('\n'));
}

test.describe('Compatibilidade do PDF em navegadores e dispositivos', () => {
  test('exibe, disponibiliza e entrega o PDF sem estouro horizontal', async ({ page }) => {
    const pdfBytes = minimalPdf();

    await page.route('**/rest/v1/rpc/get_public_proposal', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(publicProposalPayload()),
      });
    });

    await page.route('**/functions/v1/public-proposal-pdf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ signedUrl: `http://127.0.0.1:3000${PDF_PATH}` }),
      });
    });

    await page.route(`**${PDF_PATH}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: {
          'content-disposition': 'inline; filename="proposta-solamigo.pdf"',
          'cache-control': 'no-store',
        },
        body: pdfBytes,
      });
    });

    await page.goto(`/proposta/${PUBLIC_TOKEN}`);

    const pdfLink = page.getByRole('link', { name: 'Visualizar Proposta Completa (PDF)' });
    await expect(pdfLink).toBeVisible();
    await expect(pdfLink).toHaveAttribute('target', '_blank');
    await expect(pdfLink).toHaveAttribute('rel', 'noreferrer');
    await expect(pdfLink).toHaveAttribute('href', /\/e2e\/proposta-compatibilidade\.pdf$/);

    const viewport = page.viewportSize();
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    if (viewport) {
      expect(documentWidth).toBeLessThanOrEqual(viewport.width + 1);
    }

    const href = await pdfLink.getAttribute('href');
    expect(href).toBeTruthy();

    const pdfResult = await page.evaluate(async (url) => {
      const response = await fetch(url, { cache: 'no-store' });
      const bytes = new Uint8Array(await response.arrayBuffer());
      let source = '';
      for (const byte of bytes) source += String.fromCharCode(byte);

      return {
        ok: response.ok,
        contentType: response.headers.get('content-type'),
        contentDisposition: response.headers.get('content-disposition'),
        byteLength: bytes.byteLength,
        source,
      };
    }, href!);

    expect(pdfResult.ok).toBeTruthy();
    expect(pdfResult.contentType).toContain('application/pdf');
    expect(pdfResult.contentDisposition).toContain('inline');
    expect(pdfResult.source.startsWith('%PDF-')).toBeTruthy();
    expect(pdfResult.source.trimEnd().endsWith('%%EOF')).toBeTruthy();
    expect(pdfResult.byteLength).toBe(pdfBytes.byteLength);
  });
});
