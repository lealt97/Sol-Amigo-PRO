import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

const APP = 'src/App.tsx';
const GATE = 'src/components/auth/FirstUseGate.tsx';
const LAYOUT = 'src/components/Layout.tsx';
const WIZARD = 'src/pages/Onboarding.tsx';
const SERVICE = 'src/services/firstUseService.ts';


test('wizard fica fora do layout e bloqueia as rotas privadas até a conclusão', async () => {
  const [app, gate, layout] = await Promise.all([read(APP), read(GATE), read(LAYOUT)]);
  const wizardRoute = '<Route path="/primeiros-passos" element={<Onboarding />} />';
  const gateRoute = '<Route element={<FirstUseGate />}>';

  assert.ok(app.includes(wizardRoute));
  assert.ok(app.includes(gateRoute));
  assert.ok(app.indexOf(wizardRoute) < app.indexOf(gateRoute));
  assert.match(gate, /firstUseService\.requiresFirstUse\(user\)/);
  assert.ok(gate.includes('<Navigate to="/primeiros-passos" replace />'));
  assert.doesNotMatch(gate, /useLocation/);
  assert.doesNotMatch(layout, /\/primeiros-passos/);
  assert.doesNotMatch(layout, /Primeiros Passos/);
});


test('wizard salva dados nas áreas reais da conta sem estado paralelo', async () => {
  const wizard = await read(WIZARD);

  assert.match(wizard, /profileService\.updateProfile\(user\.id/);
  assert.match(wizard, /company_name:/);
  assert.match(wizard, /seller_name:/);
  assert.match(wizard, /profileService\.uploadLogo/);
  assert.match(wizard, /serializeLogos/);
  assert.match(wizard, /legalService\.acceptCurrentDocuments\(\)/);
  assert.doesNotMatch(wizard, /insert\(['"]onboarding/);
  assert.doesNotMatch(wizard, /localStorage/);
});


test('toda conta sem conclusão registrada deve passar pelo primeiro uso', async () => {
  const service = await read(SERVICE);

  assert.doesNotMatch(service, /FIRST_USE_RELEASE_AT/);
  assert.match(service, /first_use_completed_at/);
  assert.match(service, /first_use_version/);
  assert.match(service, /first_use_logo_skipped/);
  assert.match(service, /return !completedAt \|\| completedVersion < FIRST_USE_VERSION/);
  assert.match(service, /status\.complete/);
});


test('wizard contém as etapas essenciais e libera o dashboard somente no final', async () => {
  const wizard = await read(WIZARD);

  assert.match(wizard, /Boas-vindas/);
  assert.match(wizard, /Empresa/);
  assert.match(wizard, /Responsável/);
  assert.match(wizard, /Identidade visual/);
  assert.match(wizard, /Segurança e termos/);
  assert.match(wizard, /Concluir/);
  assert.match(wizard, /firstUseService\.complete\(finalStatus\)/);
  assert.match(wizard, /window\.location\.assign\('\/dashboard'\)/);
  assert.match(wizard, /fixed inset-0 z-50 overflow-y-auto bg-brand-gray/);
});
