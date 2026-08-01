import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('preferências comerciais usam margem padrão de 30%', async () => {
  const [settings, profileService, schema, migration] = await Promise.all([
    readFile('src/pages/Configuracoes.tsx', 'utf8'),
    readFile('src/services/profileService.ts', 'utf8'),
    readFile('supabase-schema.sql', 'utf8'),
    readFile('supabase/migrations/20260731220000_default_margin_30.sql', 'utf8'),
  ]);

  assert.match(settings, /default_margin_percentage \?\? 30/);
  assert.match(settings, /O padrão inicial é 30%/);
  assert.match(profileService, /default_margin_percentage: 30/);
  assert.match(schema, /default_margin_percentage NUMERIC DEFAULT 30/);
  assert.match(migration, /ALTER COLUMN default_margin_percentage SET DEFAULT 30/);
  assert.match(migration, /WHERE default_margin_percentage IS NULL/);
});
