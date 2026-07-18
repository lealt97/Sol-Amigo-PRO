import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/20260716190000_security_phase_1.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('remove políticas anônimas diretas e mantém PDFs privados', async () => {
  const sql = await readMigration();

  assert.match(sql, /drop policy if exists "Leitura anonima de proposta por token"/);
  assert.match(sql, /drop policy if exists "Atualizacao anonima de proposta por token"/);
  assert.match(sql, /drop policy if exists "Anonimo pode inserir eventos via link publico"/);
  assert.match(sql, /values \('proposals', 'proposals', false\)/);
});

test('valida o token antes de buscar a proposta pública', async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /p_token is null or length\(trim\(p_token\)\) < 20 or length\(p_token\) > 128/,
  );
});

test('registra somente a primeira visualização e muda propostas abertas para viewed', async () => {
  const sql = await readMigration();

  assert.match(sql, /and public_viewed_at is null/);
  assert.match(sql, /when status in \('draft', 'pending', 'sent'\) then 'viewed'/);
  assert.match(sql, /if v_first_view then/);
  assert.match(sql, /'public_viewed'/);
});

test('expõe somente o resumo comercial necessário pela RPC pública', async () => {
  const sql = await readMigration();

  assert.match(sql, /'pdf_available'/);
  assert.match(sql, /'client'/);
  assert.match(sql, /'company'/);
  assert.match(sql, /'solar'/);
  assert.doesNotMatch(sql, /'client_ip', p\.client_ip/);
  assert.doesNotMatch(sql, /'client_user_agent', p\.client_user_agent/);
});

test('permite somente aprovação ou recusa de propostas ainda abertas', async () => {
  const sql = await readMigration();

  assert.match(sql, /if p_status not in \('approved', 'rejected'\) then/);
  assert.match(sql, /and status in \('draft', 'pending', 'sent', 'viewed'\)/);
  assert.match(sql, /Proposta não encontrada ou não disponível para avaliação/);
});

test('limita motivo, IP e user agent e registra evento da decisão', async () => {
  const sql = await readMigration();

  assert.match(sql, /left\(trim\(coalesce\(p_reason, ''\)\), 1000\)/);
  assert.match(sql, /left\(coalesce\(p_ip, ''\), 128\)/);
  assert.match(sql, /left\(coalesce\(p_user_agent, ''\), 512\)/);
  assert.match(sql, /case when p_status = 'approved' then 'accepted' else 'rejected' end/);
});

test('concede ao público apenas execução das RPCs controladas', async () => {
  const sql = await readMigration();

  assert.match(sql, /revoke all on function public\.get_public_proposal\(text\) from public/);
  assert.match(sql, /revoke all on function public\.update_public_proposal_status\(text, text, text, text, text\) from public/);
  assert.match(sql, /grant execute on function public\.get_public_proposal\(text\) to anon, authenticated/);
  assert.match(sql, /grant execute on function public\.update_public_proposal_status\(text, text, text, text, text\) to anon, authenticated/);
});
