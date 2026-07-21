import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SESSION_CARD = 'src/components/auth/SessionSecurityCard.tsx';
const SETTINGS_ROUTE = 'src/pages/SettingsRoute.tsx';

test('segurança permite desconectar outros aparelhos sem encerrar a sessão atual', async () => {
  const card = await readFile(SESSION_CARD, 'utf8');

  assert.match(card, /supabase\.auth\.signOut\(\{ scope \}\)/);
  assert.match(card, /revokeSessions\('others'\)/);
  assert.match(card, /Desconectar outros aparelhos/);
  assert.match(card, /Este aparelho continuará conectado/);
});

test('segurança permite encerrar todas as sessões e retornar ao login', async () => {
  const card = await readFile(SESSION_CARD, 'utf8');

  assert.match(card, /revokeSessions\('global'\)/);
  assert.match(card, /Sair de todos os aparelhos/);
  assert.match(card, /window\.location\.replace\('\/login'\)/);
});

test('controle de sessões aparece somente na aba Segurança', async () => {
  const route = await readFile(SETTINGS_ROUTE, 'utf8');

  assert.match(route, /import \{ SessionSecurityCard \}/);
  assert.match(route, /activeTab === 'seguranca'/);
  assert.match(route, /<SessionSecurityCard \/>/);
  assert.match(route, /<AccountData embedded \/>/);
});
