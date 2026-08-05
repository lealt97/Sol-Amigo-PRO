import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ASSETS = [
  'logo-horizontal-light.svg', 'logo-horizontal-dark.svg',
  'logo-vertical-light.svg', 'logo-vertical-dark.svg',
  'icon-light.svg', 'icon-dark.svg',
];

test('os seis arquivos oficiais da Sol Amigo PRO estão disponíveis', async () => {
  const files = await Promise.all(ASSETS.map((name) => readFile(`public/brand/sol-amigo-pro/${name}`, 'utf8')));
  files.forEach((source) => {
    assert.match(source, /<svg/);
    assert.match(source, /#FACB5C/);
  });
});

test('o componente central escolhe formato, contraste e respeita o base path', async () => {
  const source = await readFile('src/components/brand/BrandLogo.tsx', 'utf8');
  assert.match(source, /SOL_AMIGO_PRO_BRAND_ASSETS/);
  assert.match(source, /import\.meta\.env\.BASE_URL/);
  assert.match(source, /data-platform-theme-mode/);
  assert.match(source, /MutationObserver/);
  assert.doesNotMatch(source, /['"]\/brand\/sol-amigo-pro\//);
});

test('a marca oficial aparece nos principais pontos do produto', async () => {
  const [layout, login, plans, onboarding, index, manifest] = await Promise.all([
    readFile('src/components/Layout.tsx', 'utf8'),
    readFile('src/components/brand/AnimatedLoginLogo.tsx', 'utf8'),
    readFile('src/pages/Plans.tsx', 'utf8'),
    readFile('src/pages/Onboarding.tsx', 'utf8'),
    readFile('index.html', 'utf8'),
    readFile('public/site.webmanifest', 'utf8'),
  ]);
  assert.match(layout, /format=\{isSidebarExpanded \? 'horizontal' : 'icon'\}/);
  assert.match(login, /format="vertical"/);
  assert.match(plans, /format="horizontal" surface="dark"/);
  assert.match(onboarding, /format="horizontal" surface="auto"/);
  assert.match(index, /%BASE_URL%brand\/sol-amigo-pro\/icon-light\.svg/);
  assert.match(index, /%BASE_URL%site\.webmanifest/);
  assert.match(manifest, /"start_url": "\.\/"/);
  assert.doesNotMatch(manifest, /"src": "\/brand\//);
});
