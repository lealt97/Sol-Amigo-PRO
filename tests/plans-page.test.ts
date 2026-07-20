import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PAGE_PATH = 'src/pages/Plans.tsx';
const APP_PATH = 'src/App.tsx';

test('página pública apresenta os três planos comerciais aprovados', async () => {
  const page = await readFile(PAGE_PATH, 'utf8');

  for (const planName of ['Gratuito', 'Pro Mensal', 'Pro Anual']) {
    assert.match(page, new RegExp(`name: '${planName}'`));
  }

  assert.match(page, /price: 'R\$ 0'/);
  assert.match(page, /price: 'R\$ 100'/);
  assert.match(page, /price: 'R\$ 1\.000'/);
});

test('limites de propostas refletem as decisões comerciais atuais', async () => {
  const page = await readFile(PAGE_PATH, 'utf8');

  assert.match(page, /'5 propostas por mês'/);
  assert.match(page, /'30 propostas por mês'/);
  assert.match(page, /'40 propostas por mês'/);
  assert.match(page, /'10 propostas extras todos os meses'/);
  assert.match(page, /'Economia de R\$ 200 por ano'/);
});

test('comparação foca benefícios e não comercializa quantidade de usuários', async () => {
  const page = await readFile(PAGE_PATH, 'utf8');

  assert.doesNotMatch(page, /usuários? com login/i);
  assert.doesNotMatch(page, /até 5 usuários/i);
  assert.match(page, /Todos os modelos de capa/);
  assert.match(page, /Editor avançado da proposta/);
  assert.match(page, /PDF sem marca SolAmigo/);
});

test('identidade visual usa fundo do login, textura de 8px e cores SolAmigo', async () => {
  const page = await readFile(PAGE_PATH, 'utf8');

  assert.match(page, /PLAN_TEXTURE_DATA_URI = 'data:image\/png;base64,/);
  assert.match(page, /backgroundRepeat: 'repeat'/);
  assert.match(page, /backgroundSize: '8px 8px'/);
  assert.match(page, /data-testid="plans-page"[\s\S]*bg-\[#0E2337\]/);
  assert.match(page, /data-testid="plans-brand-name"[\s\S]*text-\[#FACB5C\]/);
  assert.match(page, /data-testid="plans-title"[\s\S]*text-\[#B4BF8A\]/);
  assert.match(page, /bg-\[#142E46\]\/95/);
  assert.match(page, /bg-\[#0076DD\]/);
  assert.doesNotMatch(page, /bg-white/);
});

test('rotas de planos e preços ficam públicas sem interferir nas rotas protegidas', async () => {
  const app = await readFile(APP_PATH, 'utf8');

  const plansRouteIndex = app.indexOf('<Route path="/planos" element={<Plans />} />');
  const protectedRouteIndex = app.indexOf('<Route element={<ProtectedRoute />}>');

  assert.notEqual(plansRouteIndex, -1);
  assert.notEqual(protectedRouteIndex, -1);
  assert.ok(plansRouteIndex < protectedRouteIndex);
  assert.match(app, /<Route path="\/precos" element={<Navigate to="\/planos" replace \/>} \/>/);
});

test('checkout permanece explicitamente fora desta entrega', async () => {
  const page = await readFile(PAGE_PATH, 'utf8');

  assert.match(page, /A contratação ainda será conectada ao checkout seguro/);
  assert.doesNotMatch(page, /supabase\.functions\.invoke/);
  assert.doesNotMatch(page, /api\.stripe\.com/);
  assert.doesNotMatch(page, /api\.cakto\.com\.br/);
});
