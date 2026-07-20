import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const MIGRATION = 'supabase/migrations/20260720233000_p1_application_monitoring.sql';
const EDGE_FUNCTION = 'supabase/functions/application-monitor/index.ts';
const CLIENT = 'src/services/monitoringService.ts';
const PDF_GENERATOR = 'src/lib/pdf/generateProposalPdf.tsx';
const CHECKOUT_PAGE = 'src/pages/BillingCheckout.tsx';
const CONFIG = 'supabase/config.toml';

const read = (path: string) => readFile(path, 'utf8');

test('trilha operacional é privada, append-only e server-side', async () => {
  const migration = await read(MIGRATION);

  assert.match(migration, /create table if not exists public\.application_events/);
  assert.match(migration, /alter table public\.application_events enable row level security/);
  assert.match(migration, /grant select, insert on table public\.application_events[\s\S]*to service_role/);
  assert.match(migration, /before update or delete on public\.application_events/);
  assert.match(migration, /application_events_append_only/);
  assert.doesNotMatch(migration, /grant[^;]+application_events[^;]+authenticated/i);
});

test('Edge Function autentica, limita eventos e remove chaves sensíveis', async () => {
  const source = await read(EDGE_FUNCTION);

  assert.match(source, /admin\.auth\.getUser\(accessToken\)/);
  assert.match(source, /ALLOWED_EVENT_TYPES/);
  assert.match(source, /SENSITIVE_KEY_PATTERN/);
  assert.match(source, /\[redacted\]/);
  assert.match(source, /slice\(0, 300\)/);
  assert.match(source, /from\('application_events'\)\.insert/);
  assert.doesNotMatch(source, /metadata:\s*body\.metadata/);
});

test('falhas de PDF e checkout são enviadas sem dados pessoais do cliente', async () => {
  const [client, pdfGenerator, checkoutPage] = await Promise.all([
    read(CLIENT),
    read(PDF_GENERATOR),
    read(CHECKOUT_PAGE),
  ]);

  assert.match(client, /supabase\.functions\.invoke\('application-monitor'/);
  assert.match(pdfGenerator, /monitoringService\.capture\('pdf\.generation_failed'/);
  assert.match(pdfGenerator, /proposal_id: proposal\.id/);
  assert.doesNotMatch(pdfGenerator, /monitoringService\.capture[\s\S]{0,500}(client|document|email|phone):/i);
  assert.match(checkoutPage, /monitoringService\.capture\('checkout\.failed'/);
  assert.match(checkoutPage, /billing_interval: interval/);
});

test('monitor de aplicação exige JWT', async () => {
  const config = await read(CONFIG);
  assert.match(config, /\[functions\.application-monitor\][\s\S]*verify_jwt = true/);
});
