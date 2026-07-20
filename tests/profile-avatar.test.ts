import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SETTINGS_PATH = 'src/pages/Configuracoes.tsx';
const LAYOUT_PATH = 'src/components/Layout.tsx';
const SERVICE_PATH = 'src/services/profileService.ts';
const PROFILE_PATH = 'src/types/profile.ts';
const MIGRATION_PATH = 'supabase/migrations/20260720003000_profile_avatar.sql';
const SQL_TEST_PATH = 'supabase/tests/profile_avatar.sql';
const WORKFLOW_PATH = '.github/workflows/migrations-homologation.yml';

test('perfil e migration possuem avatar_url', async () => {
  const [profile, migration] = await Promise.all([
    readFile(PROFILE_PATH, 'utf8'),
    readFile(MIGRATION_PATH, 'utf8'),
  ]);

  assert.match(profile, /avatar_url: string \| null/);
  assert.match(migration, /add column if not exists avatar_url text/);
});

test('upload aceita somente imagens seguras e limita a dois megabytes', async () => {
  const service = await readFile(SERVICE_PATH, 'utf8');
  const avatarTypesStart = service.indexOf('const PROFILE_AVATAR_TYPES');
  const avatarTypesEnd = service.indexOf(']);', avatarTypesStart);
  const avatarTypes = service.slice(avatarTypesStart, avatarTypesEnd + 3);

  assert.ok(avatarTypesStart >= 0 && avatarTypesEnd > avatarTypesStart);
  assert.match(service, /PROFILE_AVATAR_MAX_BYTES = 2 \* 1024 \* 1024/);
  assert.match(avatarTypes, /'image\/jpeg'/);
  assert.match(avatarTypes, /'image\/png'/);
  assert.match(avatarTypes, /'image\/webp'/);
  assert.doesNotMatch(avatarTypes, /image\/svg\+xml/);
  assert.match(service, /`\$\{userId\}\/avatars\/profile-\$\{Date\.now\(\)\}/);
  assert.match(service, /path\.startsWith\(`\$\{userId\}\/avatars\/`\)/);
});

test('dados do usuário oferecem inclusão, troca e remoção da foto', async () => {
  const settings = await readFile(SETTINGS_PATH, 'utf8');

  assert.match(settings, /id="profile-avatar-upload"/);
  assert.match(settings, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(settings, /handleAvatarUpload/);
  assert.match(settings, /handleRemoveAvatar/);
  assert.match(settings, /solamigo:profile-updated/);
  assert.match(settings, /A foto será exibida no avatar do menu lateral do SaaS/);
  assert.doesNotMatch(settings, />SolAmigo Pro<\/h3>/);
});

test('navbar exibe a foto e mantém a inicial como fallback', async () => {
  const layout = await readFile(LAYOUT_PATH, 'utf8');

  assert.match(layout, /profileService\.getProfile\(user\.id\)/);
  assert.match(layout, /solamigo:profile-updated/);
  assert.match(layout, /avatarUrl && !avatarLoadFailed/);
  assert.match(layout, /object-cover/);
  assert.match(layout, /onError=\{\(\) => setAvatarLoadFailed\(true\)\}/);
  assert.match(layout, /displayName\.charAt\(0\)/);
});

test('homologação valida coluna e isolamento da foto de perfil', async () => {
  const [sqlTest, workflow] = await Promise.all([
    readFile(SQL_TEST_PATH, 'utf8'),
    readFile(WORKFLOW_PATH, 'utf8'),
  ]);

  assert.match(sqlTest, /um usuário alterou a foto de outra conta/);
  assert.match(sqlTest, /a coluna avatar_url não existe em profiles/);
  assert.match(workflow, /Testar foto de perfil/);
  assert.match(workflow, /profile_avatar\.sql/);
});
