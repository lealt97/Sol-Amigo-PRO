import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROCESS_PATH = 'docs/ADMIN_ACCOUNT_RECOVERY_PROCESS.md';
const LOST_PHONE_PATH = 'docs/MFA_LOST_PHONE_PROCEDURE.md';
const CHECKLIST_PATH = 'docs/PROJECT_COMPLETION_CHECKLIST.md';
const README_PATH = 'README.md';

test('processo administrativo exige segregação, AAL2 e confirmação recente', async () => {
  const process = await readFile(PROCESS_PATH, 'utf8');

  assert.match(process, /Duplo controle/);
  assert.match(process, /A pessoa que valida a identidade não pode ser a mesma que aprova e executa/);
  assert.match(process, /MFA em AAL2/);
  assert.match(process, /confirmação recente de senha/);
  assert.match(process, /solicitante, verificador, aprovador e executor/);
  assert.match(process, /conta administrativa individual/);
});

test('processo proíbe atalhos, segredos e senha temporária', async () => {
  const process = await readFile(PROCESS_PATH, 'utf8');

  for (const safeguard of [
    'Sem senha temporária',
    'Sem alteração manual',
    'Nunca solicitar, receber, copiar ou armazenar',
    'É proibido executar SQL improvisado',
    'nunca definir ou visualizar uma senha',
    'sem `service_role` no frontend',
  ]) {
    assert.ok(process.includes(safeguard), `processo deve conter: ${safeguard}`);
  }

  assert.doesNotMatch(process, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(process, /postgresql:\/\/[^.\s]+:[^.<\s]+@(?:db|aws-0)/);
});

test('verificação usa sinais independentes e rejeita sinais públicos isolados', async () => {
  const process = await readFile(PROCESS_PATH, 'utf8');

  assert.match(process, /ao menos \*\*dois sinais independentes\*\*/);
  assert.match(process, /um deles não público e previamente vinculado à conta/);
  assert.match(process, /Sinais que nunca podem ser usados sozinhos/);
  assert.match(process, /número de telefone ou SMS/);
  assert.match(process, /nome, CPF ou CNPJ disponível publicamente/);
  assert.match(process, /período de espera mínimo de 48 horas/);
  assert.match(process, /duas aprovações independentes de segurança/);
});

test('execução segura revoga sessões e exige nova proteção MFA', async () => {
  const process = await readFile(PROCESS_PATH, 'utf8');

  assert.match(process, /revogar globalmente todas as sessões pelo Supabase Auth Admin API/);
  assert.match(process, /revogar todos os códigos de recuperação MFA ativos/);
  assert.match(process, /remover os fatores MFA exclusivamente pelo Supabase Auth Admin API/);
  assert.match(process, /novo fator TOTP foi verificado/);
  assert.match(process, /dez novos códigos foram gerados/);
  assert.match(process, /notificar o e-mail original/);
  assert.match(process, /recovered_pending_mfa/);
});

test('processo permanece bloqueado sem pré-requisitos e está registrado no projeto', async () => {
  const [process, lostPhone, checklist, readme] = await Promise.all([
    readFile(PROCESS_PATH, 'utf8'),
    readFile(LOST_PHONE_PATH, 'utf8'),
    readFile(CHECKLIST_PATH, 'utf8'),
    readFile(README_PATH, 'utf8'),
  ]);

  assert.match(process, /A execução de uma recuperação administrativa permanece \*\*bloqueada\*\*/);
  assert.match(process, /bloqueado — pré-requisito indisponível/);
  assert.match(process, /não antecipa as funcionalidades administrativas previstas para a Fase 4/);
  assert.match(lostPhone, /docs\/ADMIN_ACCOUNT_RECOVERY_PROCESS\.md/);
  assert.match(checklist, /- \[x\] Definir processo administrativo seguro de recuperação de conta/);
  assert.match(checklist, /Evidência do processo administrativo seguro de recuperação de conta:/);
  assert.match(readme, /docs\/ADMIN_ACCOUNT_RECOVERY_PROCESS\.md/);
});
