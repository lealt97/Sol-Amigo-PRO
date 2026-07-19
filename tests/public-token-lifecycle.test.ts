import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const MIGRATION_PATH = 'supabase/migrations/20260719173000_public_token_lifecycle.sql';
const EDGE_FUNCTION_PATH = 'supabase/functions/public-proposal-pdf/index.ts';
const SQL_TEST_PATH = 'supabase/tests/public_token_lifecycle.sql';

test('migration adiciona expiração, revogação e renovação sem invalidar tokens legados', async () => {
  const migration = await readFile(MIGRATION_PATH, 'utf8');

  assert.match(migration, /public_token_expires_at\s+timestamptz/);
  assert.match(migration, /public_token_revoked_at\s+timestamptz/);
  assert.match(migration, /public_token_expires_at is null or [\w.]*public_token_expires_at > now\(\)/);
  assert.match(migration, /public_token_revoked_at is null/);
  assert.match(migration, /create or replace function public\.revoke_public_proposal_token/);
  assert.match(migration, /create or replace function public\.rotate_public_proposal_token/);
  assert.match(migration, /'public_token_revoked'/);
  assert.match(migration, /'public_token_rotated'/);
});

test('todas as RPCs públicas bloqueiam token expirado ou revogado', async () => {
  const migration = await readFile(MIGRATION_PATH, 'utf8');
  const protectedFunctions = [
    'get_public_proposal',
    'update_public_proposal_status',
    'mark_public_proposal_viewed',
    'accept_public_proposal',
    'reject_public_proposal',
  ];

  for (const functionName of protectedFunctions) {
    const start = migration.indexOf(`function public.${functionName}`);
    assert.notEqual(start, -1, `${functionName}: função ausente`);

    const nextFunction = migration.indexOf('create or replace function public.', start + 1);
    const body = migration.slice(start, nextFunction === -1 ? undefined : nextFunction);

    assert.match(body, /public_token_revoked_at is null/, `${functionName}: revogação não verificada`);
    assert.match(
      body,
      /public_token_expires_at is null or [\w.]*public_token_expires_at > now\(\)/,
      `${functionName}: expiração não verificada`,
    );
  }
});

test('Edge Function não assina PDF para token expirado, revogado ou com expiração inválida', async () => {
  const source = await readFile(EDGE_FUNCTION_PATH, 'utf8');

  assert.match(source, /public_token_expires_at, public_token_revoked_at/);
  assert.match(source, /function isPublicTokenUnavailable/);
  assert.match(source, /if \(revokedAt\) return true/);
  assert.match(source, /if \(!expiresAt\) return false/);
  assert.match(source, /!Number\.isFinite\(expirationTime\)/);
  assert.match(source, /expirationTime <= Date\.now\(\)/);
  assert.match(source, /isPublicTokenUnavailable\(/);
  assert.match(source, /Proposta não encontrada/);
});

test('homologação cobre token inválido, expirado, revogado, legado, revogação e renovação', async () => {
  const source = await readFile(SQL_TEST_PATH, 'utf8');

  for (const scenario of [
    'token inexistente deveria ser rejeitado',
    'token expirado deveria ser rejeitado',
    'token revogado deveria ser rejeitado',
    'token legado sem expiração deveria continuar válido',
    'token ativo deveria continuar válido',
    'proprietário não conseguiu revogar o token',
    'proprietário não conseguiu renovar o token',
  ]) {
    assert.match(source, new RegExp(scenario));
  }

  assert.match(source, /rollback;/);
});
