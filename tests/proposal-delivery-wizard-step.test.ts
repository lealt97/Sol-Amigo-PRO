import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const WIZARD = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const DELIVERY_PANEL = 'src/components/proposals/ProposalDeliveryPanel.tsx';

test('entrega de proposta é a última etapa do wizard', async () => {
  const source = await readFile(WIZARD, 'utf8');
  const deliveryPanel = await readFile(DELIVERY_PANEL, 'utf8');

  assert.match(source, /\{ id: 'delivery', title: 'Gerar e enviar' \}/);
  assert.match(source, /<ProposalDeliveryPanel proposal=\{completedProposal\}/);
  assert.match(source, /setCurrentStep\(STEPS\.length - 1\)/);
  assert.match(source, /Concluir e preparar envio/);
  assert.match(deliveryPanel, /Escolha um modelo salvo em Meus modelos/);
  assert.match(deliveryPanel, /Gerar PDF e link público/);
  assert.match(deliveryPanel, /Enviar pelo WhatsApp/);
  assert.match(deliveryPanel, /QR Code/);
});
