import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { formatBrazilianPhoneInput } from '../src/lib/formatters/phone';

test('formata celular brasileiro durante a digitação', () => {
  assert.equal(formatBrazilianPhoneInput('1'), '(1');
  assert.equal(formatBrazilianPhoneInput('11'), '(11) ');
  assert.equal(formatBrazilianPhoneInput('119'), '(11) 9');
  assert.equal(formatBrazilianPhoneInput('11987654321'), '(11) 98765-4321');
});

test('formata telefone fixo e limita a onze dígitos', () => {
  assert.equal(formatBrazilianPhoneInput('1132654321'), '(11) 3265-4321');
  assert.equal(formatBrazilianPhoneInput('(11) 98765-4321 ramal 99'), '(11) 98765-4321');
});

test('campo de WhatsApp usa o input telefônico com máscara centralizada', async () => {
  const [input, clientForm] = await Promise.all([
    readFile('src/components/ui/Input.tsx', 'utf8'),
    readFile('src/pages/clientes/ClientForm.tsx', 'utf8'),
  ]);

  assert.match(input, /type === "tel"/);
  assert.match(input, /formatBrazilianPhoneInput\(event\.currentTarget\.value\)/);
  assert.match(clientForm, /id="phone" type="tel"/);
  assert.match(clientForm, /phone: formatBrazilianPhoneInput\(client\.phone \|\| ''\)/);
});
