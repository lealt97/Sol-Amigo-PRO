import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

type ActivePolicy = {
  name: string;
  target: string;
  statement: string;
};

async function walkSqlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkSqlFiles(fullPath);
    return entry.name.endsWith('.sql') ? [fullPath] : [];
  }));
  return files.flat();
}

function normalizeSql(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function parseEffectivePolicies(sqlFiles: Array<{ name: string; sql: string }>) {
  const active = new Map<string, ActivePolicy>();

  for (const file of sqlFiles) {
    const statements = file.sql
      .split(';')
      .map(normalizeSql)
      .filter(Boolean);

    for (const statement of statements) {
      const drop = statement.match(
        /drop policy(?: if exists)?\s+"([^"]+)"\s+on\s+((?:public|storage)\.[a-z0-9_]+)/i,
      );
      if (drop) {
        active.delete(`${drop[2].toLowerCase()}:${drop[1]}`);
        continue;
      }

      const create = statement.match(
        /create policy\s+"([^"]+)"\s+on\s+((?:public|storage)\.[a-z0-9_]+)/i,
      );
      if (create) {
        active.set(`${create[2].toLowerCase()}:${create[1]}`, {
          name: create[1],
          target: create[2].toLowerCase(),
          statement,
        });
      }
    }
  }

  return [...active.values()];
}

async function loadSecuritySql() {
  const migrationPaths = (await walkSqlFiles('supabase/migrations')).sort();
  const files: Array<{ name: string; sql: string }> = [];

  try {
    files.push({ name: 'supabase-schema.sql', sql: await readFile('supabase-schema.sql', 'utf8') });
  } catch {
    // Some deployments use migrations only.
  }

  for (const migrationPath of migrationPaths) {
    files.push({ name: migrationPath, sql: await readFile(migrationPath, 'utf8') });
  }

  return {
    combined: normalizeSql(files.map((file) => file.sql).join('\n')),
    policies: parseEffectivePolicies(files),
  };
}

function policiesFor(policies: ActivePolicy[], target: string) {
  return policies.filter((policy) => policy.target === target);
}

function assertOwnerCrudPolicies(policies: ActivePolicy[], target: string, ownerColumn: string) {
  const tablePolicies = policiesFor(policies, target);
  const combined = tablePolicies.map((policy) => policy.statement).join(' ');

  assert.match(combined, /for select/i);
  assert.match(combined, /for insert/i);
  assert.match(combined, /for update/i);
  assert.match(combined, /for delete/i);
  assert.match(combined, new RegExp(`auth\\.uid\\(\\)\\s*=\\s*${ownerColumn}`, 'i'));
}

test('mantém RLS habilitado nas tabelas com dados de cada empresa', async () => {
  const { combined } = await loadSecuritySql();
  const protectedTables = [
    'profiles',
    'clients',
    'proposals',
    'solar_system_calculations',
    'proposal_loads',
    'proposal_events',
    'solar_kits',
    'pdf_user_models',
  ];

  for (const table of protectedTables) {
    assert.match(
      combined,
      new RegExp(`alter table(?: if exists)? public\\.${table} enable row level security`, 'i'),
      `RLS ausente em public.${table}`,
    );
  }
});

test('clientes e propostas permanecem limitados ao proprietário', async () => {
  const { policies } = await loadSecuritySql();
  assertOwnerCrudPolicies(policies, 'public.clients', 'user_id');
  assertOwnerCrudPolicies(policies, 'public.proposals', 'user_id');
});

test('kits e modelos de PDF permanecem limitados ao proprietário', async () => {
  const { policies } = await loadSecuritySql();
  assertOwnerCrudPolicies(policies, 'public.solar_kits', 'user_id');
  assertOwnerCrudPolicies(policies, 'public.pdf_user_models', 'user_id');
});

test('cálculos, cargas e eventos dependem da propriedade da proposta', async () => {
  const { policies } = await loadSecuritySql();

  for (const target of [
    'public.solar_system_calculations',
    'public.proposal_loads',
    'public.proposal_events',
  ]) {
    const combined = policiesFor(policies, target)
      .map((policy) => policy.statement)
      .join(' ');

    assert.match(combined, /exists\s*\(\s*select 1/i);
    assert.match(combined, /proposals\.user_id\s*=\s*auth\.uid\(\)|p\.user_id\s*=\s*auth\.uid\(\)/i);
  }
});

test('arquivos privados e gravações de identidade visual usam pasta do usuário', async () => {
  const { policies } = await loadSecuritySql();

  for (const bucket of ['proposals', 'pdf-assets', 'logos']) {
    const storagePolicies = policiesFor(policies, 'storage.objects')
      .filter((policy) => policy.statement.includes(`bucket_id = '${bucket}'`));
    const combined = storagePolicies.map((policy) => policy.statement).join(' ');

    assert.match(combined, /storage\.foldername\(name\)\)\[1\]\s*=\s*auth\.uid\(\)::text/i);
    assert.match(combined, /for insert/i);
    assert.match(combined, /for update/i);
    assert.match(combined, /for delete/i);
  }
});

test('políticas legadas amplas do bucket de logos não permanecem ativas', async () => {
  const { policies } = await loadSecuritySql();
  const activeNames = new Set(policies.map((policy) => policy.name));

  assert.equal(activeNames.has('Authenticated upload logos bucket'), false);
  assert.equal(activeNames.has('Authenticated update logos bucket'), false);
  assert.equal(activeNames.has('Authenticated delete logos bucket'), false);
});

test('link público não restaura acesso anônimo direto à tabela de propostas', async () => {
  const { policies } = await loadSecuritySql();
  const activeNames = new Set(policies.map((policy) => policy.name));

  assert.equal(activeNames.has('Leitura anonima de proposta por token'), false);
  assert.equal(activeNames.has('Atualizacao anonima de proposta por token'), false);
  assert.equal(activeNames.has('Anonimo pode inserir eventos via link publico'), false);
});
