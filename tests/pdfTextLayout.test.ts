import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  estimatePdfTextWidth,
  fitTextWithinBox,
  formatClientAddress,
  normalizePdfText,
} from '../src/lib/pdf/textLayout';

function assertFits(
  value: string,
  options: Parameters<typeof fitTextWithinBox>[1],
) {
  const layout = fitTextWithinBox(value, options);

  assert.ok(layout.lines.length <= (options.maxLines || 1));
  assert.ok(layout.height <= options.height + 0.001);
  assert.ok(layout.width <= options.width + 0.001);
  layout.lines.forEach((line) => {
    assert.ok(estimatePdfTextWidth(line, layout.fontSize) <= options.width + 0.001);
  });

  return layout;
}

test('nome empresarial longo é preservado e cabe na capa personalizada', () => {
  const value = 'Associação Brasileira de Proprietários Rurais e Produtores de Energia Solar Fotovoltaica do Vale do Jequitinhonha';
  const layout = assertFits(value, {
    width: 230,
    height: 32,
    maxFontSize: 12,
    minFontSize: 5,
    maxLines: 2,
  });

  assert.equal(layout.lines.join(' '), normalizePdfText(value));
});

test('nome longo cabe na capa padrão sem perder palavras', () => {
  const value = 'Maria Eduarda de Albuquerque Vasconcelos Representações Comerciais e Participações Limitada';
  const layout = assertFits(value, {
    width: 420,
    height: 48,
    maxFontSize: 20,
    minFontSize: 8,
    maxLines: 2,
  });

  assert.equal(layout.lines.join(' '), normalizePdfText(value));
});

test('endereço completo mantém rua, número, complemento, bairro, cidade, estado e CEP', () => {
  const address = formatClientAddress({
    address: 'Avenida Doutor José Bonifácio de Andrada e Silva',
    number: '12580',
    complement: 'Bloco Empresarial Solar, Torre Norte, Sala 1804',
    neighborhood: 'Distrito Industrial de Energias Renováveis',
    city: 'São José do Vale do Rio Preto',
    state: 'RJ',
    cep: '25780-000',
  });

  assert.match(address, /Avenida Doutor José Bonifácio de Andrada e Silva, 12580/);
  assert.match(address, /Bloco Empresarial Solar, Torre Norte, Sala 1804/);
  assert.match(address, /Distrito Industrial de Energias Renováveis/);
  assert.match(address, /São José do Vale do Rio Preto - RJ/);
  assert.match(address, /CEP 25780-000/);
});

test('endereço longo cabe no bloco de identificação sem truncamento', () => {
  const address = formatClientAddress({
    address: 'Avenida Doutor José Bonifácio de Andrada e Silva',
    number: '12580',
    complement: 'Bloco Empresarial Solar, Torre Norte, Sala 1804',
    neighborhood: 'Distrito Industrial de Energias Renováveis',
    city: 'São José do Vale do Rio Preto',
    state: 'RJ',
    cep: '25780-000',
  });
  const layout = assertFits(address, {
    width: 195,
    height: 42,
    maxFontSize: 8,
    minFontSize: 4,
    maxLines: 4,
    lineHeightFactor: 1.12,
  });

  assert.equal(layout.lines.join(' '), normalizePdfText(address));
});

test('palavra sem espaços é quebrada sem perder caracteres', () => {
  const value = 'CONDOMINIORESIDENCIALENERGIASOLARFOTOVOLTAICAINTEGRADA';
  const layout = assertFits(value, {
    width: 112,
    height: 32,
    maxFontSize: 12,
    minFontSize: 5,
    maxLines: 2,
  });

  assert.equal(layout.lines.join(''), value);
});

test('texto curto conserva o tamanho máximo configurado', () => {
  const layout = fitTextWithinBox('Ana Souza', {
    width: 230,
    height: 32,
    maxFontSize: 12,
    minFontSize: 5,
    maxLines: 2,
  });

  assert.equal(layout.fontSize, 12);
  assert.deepEqual(layout.lines, ['Ana Souza']);
});

test('capa padrão e sobreposição personalizada usam o ajuste compartilhado de texto', async () => {
  const files = [
    'src/components/pdf/sections/CoverPage.tsx',
    'src/components/pdf/sections/DynamicCoverOverlay.tsx',
  ];

  for (const file of files) {
    const source = await readFile(path.join(process.cwd(), file), 'utf8');
    assert.match(source, /fitTextWithinBox/);
  }

  const generationSource = await readFile(
    path.join(process.cwd(), 'src/lib/pdf/generateProposalPdf.tsx'),
    'utf8',
  );
  assert.match(generationSource, /address, number, neighborhood, complement/);
});

test('dimensões inválidas são rejeitadas', () => {
  assert.throws(
    () => fitTextWithinBox('Cliente', {
      width: 0,
      height: 20,
      maxFontSize: 12,
    }),
    /positive finite number/,
  );
});
