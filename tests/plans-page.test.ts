import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  FREE_PLAN,
  PRO_ANNUAL,
  PRO_ANNUAL_SAVINGS_CENTS,
  PRO_MONTHLY,
} from '../src/lib/billing/planCatalog';

const PAGE_PATH = 'src/pages/Plans.tsx';
const APP_PATH = 'src/App.tsx';
const CHECKOUT_PAGE_PATH = 'src/pages/BillingCheckout.tsx';
const CHECKOUT_SERVICE_PATH = 'src/services/billingService.ts';
const TEXTURE_STYLE_PATH = 'src/styles/plans-texture.css';

test('página pública consome preços e limites do catálogo comercial único', async () => {
  const page = await readFile(PAGE_PATH, 'utf8');

  assert.equal(FREE_PLAN.priceCents, 0);
  assert.equal(PRO_MONTHLY.priceCents, 10_000);
  assert.equal(PRO_ANNUAL.priceCents, 100_000);
  assert.equal(PRO_ANNUAL_SAVINGS_CENTS, 20_000);

  assert.match(page, /from '\.\.\/lib\/billing\/planCatalog'/);
  assert.match(page, /FREE_PLAN\.priceCents/);
  assert.match(page, /PRO_MONTHLY\.priceCents/);
  assert.match(page, /PRO_ANNUAL\.priceCents/);
  assert.match(page, /PRO_ANNUAL_SAVINGS_CENTS/);
});

test('limites de propostas refletem as decisões comerciais atuais', async () => {
  const page = await readFile(PAGE_PATH, 'utf8');

  assert.equal(FREE_PLAN.limits.proposalsPerMonth, 5);
  assert.equal(PRO_MONTHLY.limits.proposalsPerMonth, 30);
  assert.equal(PRO_ANNUAL.limits.proposalsPerMonth, 40);
  assert.equal(
    PRO_ANNUAL.limits.proposalsPerMonth - PRO_MONTHLY.limits.proposalsPerMonth,
    10,
  );

  assert.match(page, /FREE_PLAN\.limits\.proposalsPerMonth/);
  assert.match(page, /PRO_MONTHLY\.limits\.proposalsPerMonth/);
  assert.match(page, /PRO_ANNUAL\.limits\.proposalsPerMonth/);
  assert.doesNotMatch(page, /'100 propostas por mês'/);
});

test('comparação foca benefícios e não comercializa quantidade de usuários', async () => {
  const page = await readFile(PAGE_PATH, 'utf8');

  assert.doesNotMatch(page, /usuários? com login/i);
  assert.doesNotMatch(page, /até 5 usuários/i);
  assert.match(page, /Todos os modelos de capa/);
  assert.match(page, /Editor avançado da proposta/);
  assert.match(page, /PDF sem marca SolAmigo/);
});

test('identidade visual usa fundo do login, textura de 6px centralizada e opacidade 0.9', async () => {
  const [page, app, textureStyle] = await Promise.all([
    readFile(PAGE_PATH, 'utf8'),
    readFile(APP_PATH, 'utf8'),
    readFile(TEXTURE_STYLE_PATH, 'utf8'),
  ]);

  assert.match(page, /data-testid="plans-page"[\s\S]*bg-\[#0E2337\]/);
  assert.match(page, /data-testid="plans-brand-name"[\s\S]*<BrandLogo[\s\S]*format="horizontal"[\s\S]*surface="dark"/);
  assert.match(page, /data-testid="plans-title"[\s\S]*text-\[#B4BF8A\]/);
  assert.match(page, /bg-\[#142E46\]\/95/);
  assert.match(page, /bg-\[#0076DD\]/);
  assert.doesNotMatch(page, /bg-white/);

  assert.match(app, /import "\.\/styles\/plans-texture\.css";/);
  assert.match(textureStyle, /\[data-testid="plans-texture"\]/);
  assert.match(textureStyle, /opacity: 0\.9 !important/);
  assert.match(textureStyle, /background-repeat: repeat !important/);
  assert.match(textureStyle, /background-size: 6px 6px !important/);
  assert.match(textureStyle, /background-position: center center !important/);

  const dataUriMatch = textureStyle.match(/base64,([A-Za-z0-9+/=]+)"\)/);
  assert.ok(dataUriMatch, 'A textura original precisa estar incorporada ao CSS.');

  const png = Buffer.from(dataUriMatch[1], 'base64');
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png.readUInt32BE(16), 8);
  assert.equal(png.readUInt32BE(20), 8);
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

test('planos pagos apontam para checkout autenticado e server-side', async () => {
  const [page, app, checkoutPage, checkoutService] = await Promise.all([
    readFile(PAGE_PATH, 'utf8'),
    readFile(APP_PATH, 'utf8'),
    readFile(CHECKOUT_PAGE_PATH, 'utf8'),
    readFile(CHECKOUT_SERVICE_PATH, 'utf8'),
  ]);

  assert.match(page, /`\/checkout\?interval=\$\{interval\}`/);
  assert.match(page, /plano muda apenas depois da confirmação assinada do provedor/);
  assert.match(app, /<Route path="checkout" element={<BillingCheckout \/>} \/>/);
  assert.match(checkoutPage, /billingService\.startCheckout\(interval\)/);
  assert.match(checkoutPage, /window\.location\.assign\(checkout\.checkoutUrl\)/);
  assert.match(checkoutService, /supabase\.functions\.invoke\('billing-checkout'/);
  assert.doesNotMatch(page, /api\.stripe\.com/);
  assert.doesNotMatch(page, /api\.cakto\.com\.br/);
});
