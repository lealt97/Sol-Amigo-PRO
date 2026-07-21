import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

const APP = 'src/App.tsx';
const GATE = 'src/components/auth/FirstUseGate.tsx';
const LAYOUT = 'src/components/Layout.tsx';
const WIZARD = 'src/pages/Onboarding.tsx';
const FIRST_USE_ROUTE = 'src/pages/FirstUseRoute.tsx';
const SERVICE = 'src/services/firstUseService.ts';
const PROFILE_SERVICE = 'src/services/profileService.ts';


test('wizard fica fora do layout e bloqueia as rotas privadas até a conclusão', async () => {
  const [app, gate, layout] = await Promise.all([read(APP), read(GATE), read(LAYOUT)]);
  const wizardRoute = '<Route path="/primeiros-passos" element={<FirstUseRoute />} />';
  const gateRoute = '<Route element={<FirstUseGate />}>';

  assert.ok(app.includes(wizardRoute));
  assert.ok(app.includes(gateRoute));
  assert.ok(app.indexOf(wizardRoute) < app.indexOf(gateRoute));
  assert.match(gate, /firstUseService\.requiresFirstUse\(user\)/);
  assert.ok(gate.includes('<Navigate to="/primeiros-passos" replace />'));
  assert.doesNotMatch(layout, /\/primeiros-passos/);
  assert.doesNotMatch(layout, /Primeiros Passos/);
});


test('usuário consegue sair da conta mesmo durante o primeiro uso', async () => {
  const route = await read(FIRST_USE_ROUTE);

  assert.match(route, /const \{ signOut \} = useAuth\(\)/);
  assert.match(route, /await signOut\(\)/);
  assert.match(route, /window\.location\.replace\('\/login'\)/);
  assert.match(route, /Sair da conta/);
  assert.match(route, /fixed right-4 top-4 z-\[70\]/);
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
  assert.match(service, /return !completedAt \|\| completedVersion < FIRST_USE_VERSION/);
  assert.match(service, /status\.complete/);
});


test('progresso regressa e o wizard volta quando dados obrigatórios são apagados', async () => {
  const [gate, service, profileService] = await Promise.all([
    read(GATE),
    read(SERVICE),
    read(PROFILE_SERVICE),
  ]);

  assert.match(gate, /firstUseService\.load\(user\)/);
  assert.match(gate, /!snapshot\.status\.complete/);
  assert.match(gate, /firstUseService\.invalidateCompletion\(\)/);
  assert.match(gate, /solamigo:profile-updated/);
  assert.match(gate, /requiredProfileDataComplete/);
  assert.doesNotMatch(gate, /useLocation/);
  assert.match(service, /first_use_completed_at: null/);
  assert.match(profileService, /notifyProfileUpdated\(updatedProfile\)/);
  assert.match(profileService, /solamigo:profile-updated/);
});


test('etapa 4 de 6 permite continuar com uma logo e mantém limite máximo de três', async () => {
  const [wizard, service] = await Promise.all([read(WIZARD), read(SERVICE)]);

  assert.match(wizard, /Etapa \{currentStep \+ 1\} de \{STEPS\.length\}/);
  assert.match(wizard, /pelo menos 1 logo/);
  assert.match(wizard, /no máximo/);
  assert.match(wizard, /MIN_FIRST_USE_LOGOS/);
  assert.match(wizard, /MAX_ACCOUNT_LOGOS/);
  assert.match(wizard, /logoCount >= MIN_FIRST_USE_LOGOS/);
  assert.match(wizard, /logoCount >= MAX_ACCOUNT_LOGOS/);
  assert.match(wizard, /Após o primeiro upload, você já poderá continuar/);
  assert.match(wizard, /currentStep === 3 && !hasMinimumLogo/);
  assert.match(service, /MIN_FIRST_USE_LOGOS = 1/);
  assert.match(service, /extractAllLogos\(profile\.logo_url\)\.length >= MIN_FIRST_USE_LOGOS/);
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
