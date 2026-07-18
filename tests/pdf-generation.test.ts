import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProposalPdfStoragePath,
  createPdfGenerationOperations,
  type PdfGenerationRepository,
} from '../src/lib/pdf/pdfGenerationOperations';
import type { Proposal } from '../src/types/proposal';

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 'proposal-123',
    user_id: 'user-456',
    client_id: 'client-1',
    code: 'PROP-001',
    title: 'Proposta Solar',
    status: 'draft',
    revision: 1,
    system_type: 'on_grid',
    consumption_source: 'average',
    history: [],
    estimated_daily_consumption: null,
    monthly_consumption_kwh: 500,
    bill_amount: 600,
    energy_tariff: 1.2,
    battery_capacity_kwh: null,
    usable_battery_capacity_kwh: null,
    backup_power_kw: null,
    autonomy_hours: null,
    essential_loads_description: null,
    kit_cost: 10000,
    labor_cost: 2000,
    fixed_costs: 500,
    freight_cost: 300,
    taxes: 0,
    commission: 0,
    other_costs: 0,
    margin_percentage: 20,
    discount_percentage: 0,
    total_cost: 12800,
    gross_price: 16000,
    discount_value: 0,
    final_price: 16000,
    estimated_profit: 3200,
    real_margin_percentage: 20,
    markup_percentage: 25,
    pdf_url: null,
    pdf_storage_path: null,
    public_token: null,
    sent_whatsapp_at: null,
    accepted_at: null,
    rejected_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createRepository(
  overrides: Partial<PdfGenerationRepository> = {},
): PdfGenerationRepository {
  return {
    render: async () => new Blob(['%PDF-1.7 test'], { type: 'application/pdf' }),
    upload: async () => undefined,
    persistMetadata: async ({ secureUrl }) => secureUrl,
    remove: async () => undefined,
    ...overrides,
  };
}

function createOperations(
  repository: PdfGenerationRepository,
  logs: { errors: unknown[]; warnings: unknown[] } = { errors: [], warnings: [] },
) {
  return createPdfGenerationOperations(repository, {
    createToken: () => 'generated-token',
    buildSecureUrl: (token) => `https://secure.test/pdf?token=${token}`,
    logger: {
      error: (_message, error) => logs.errors.push(error),
      warn: (_message, error) => logs.warnings.push(error),
    },
  });
}

test('cria caminho estável e seguro por usuário e proposta', () => {
  const path = buildProposalPdfStoragePath(makeProposal({
    id: ' proposta/123 ',
    user_id: ' usuário 456 ',
  }));

  assert.equal(path, 'usu-rio-456/proposta-proposta-123.pdf');
});

test('gera, envia e persiste o PDF com token seguro', async () => {
  const calls: string[] = [];
  const repository = createRepository({
    render: async (_proposal, modelId) => {
      calls.push(`render:${modelId}`);
      return new Blob(['%PDF-1.7 válido'], { type: 'application/pdf' });
    },
    upload: async (path, blob) => {
      calls.push(`upload:${path}:${blob.type}:${blob.size > 0}`);
    },
    persistMetadata: async (input) => {
      calls.push(`metadata:${input.proposalId}:${input.publicToken}:${input.storagePath}`);
      return input.secureUrl;
    },
  });

  const result = await createOperations(repository).generateAndStore(makeProposal(), 'model-9');

  assert.equal(result, 'https://secure.test/pdf?token=generated-token');
  assert.deepEqual(calls, [
    'render:model-9',
    'upload:user-456/proposta-proposal-123.pdf:application/pdf:true',
    'metadata:proposal-123:generated-token:user-456/proposta-proposal-123.pdf',
  ]);
});

test('reutiliza o token público existente da proposta', async () => {
  let persistedToken = '';
  const repository = createRepository({
    persistMetadata: async (input) => {
      persistedToken = input.publicToken;
      return input.secureUrl;
    },
  });

  const result = await createOperations(repository).generateAndStore(
    makeProposal({ public_token: 'existing-token' }),
  );

  assert.equal(persistedToken, 'existing-token');
  assert.equal(result, 'https://secure.test/pdf?token=existing-token');
});

test('gerações repetidas substituem o mesmo arquivo sem criar versões órfãs', async () => {
  const uploadedPaths: string[] = [];
  const removedPaths: string[] = [];
  const repository = createRepository({
    upload: async (path) => {
      uploadedPaths.push(path);
    },
    remove: async (path) => {
      removedPaths.push(path);
    },
  });
  const operations = createOperations(repository);
  const proposal = makeProposal({
    pdf_storage_path: 'user-456/proposta-proposal-123.pdf',
    public_token: 'existing-token',
  });

  await operations.generateAndStore(proposal);
  await operations.generateAndStore(proposal);

  assert.deepEqual(uploadedPaths, [
    'user-456/proposta-proposal-123.pdf',
    'user-456/proposta-proposal-123.pdf',
  ]);
  assert.deepEqual(removedPaths, []);
});

test('remove o arquivo antigo somente depois de persistir a nova versão', async () => {
  const calls: string[] = [];
  const repository = createRepository({
    upload: async (path) => {
      calls.push(`upload:${path}`);
    },
    persistMetadata: async ({ secureUrl }) => {
      calls.push('metadata');
      return secureUrl;
    },
    remove: async (path) => {
      calls.push(`remove:${path}`);
    },
  });

  const result = await createOperations(repository).generateAndStore(makeProposal({
    pdf_storage_path: 'user-456/proposta-antiga-1700000000.pdf',
  }));

  assert.ok(result);
  assert.deepEqual(calls, [
    'upload:user-456/proposta-proposal-123.pdf',
    'metadata',
    'remove:user-456/proposta-antiga-1700000000.pdf',
  ]);
});

test('interrompe o fluxo quando o renderizador falha', async () => {
  let uploaded = false;
  const logs = { errors: [] as unknown[], warnings: [] as unknown[] };
  const repository = createRepository({
    render: async () => Promise.reject(new Error('Falha de renderização')),
    upload: async () => {
      uploaded = true;
    },
  });

  const result = await createOperations(repository, logs).generateAndStore(makeProposal());

  assert.equal(result, null);
  assert.equal(uploaded, false);
  assert.equal(logs.errors.length, 1);
});

test('rejeita PDF vazio antes do upload', async () => {
  let uploaded = false;
  const repository = createRepository({
    render: async () => new Blob([], { type: 'application/pdf' }),
    upload: async () => {
      uploaded = true;
    },
  });

  const result = await createOperations(repository).generateAndStore(makeProposal());

  assert.equal(result, null);
  assert.equal(uploaded, false);
});

test('não persiste metadados quando o upload falha', async () => {
  let metadataPersisted = false;
  const repository = createRepository({
    upload: async () => Promise.reject(new Error('Storage indisponível')),
    persistMetadata: async ({ secureUrl }) => {
      metadataPersisted = true;
      return secureUrl;
    },
  });

  const result = await createOperations(repository).generateAndStore(makeProposal());

  assert.equal(result, null);
  assert.equal(metadataPersisted, false);
});

test('remove o novo arquivo quando os metadados não podem ser persistidos', async () => {
  const removedPaths: string[] = [];
  const repository = createRepository({
    persistMetadata: async () => Promise.reject(new Error('Falha no banco')),
    remove: async (path) => {
      removedPaths.push(path);
    },
  });

  const result = await createOperations(repository).generateAndStore(makeProposal());

  assert.equal(result, null);
  assert.deepEqual(removedPaths, ['user-456/proposta-proposal-123.pdf']);
});

test('não apaga a versão atual quando a atualização de metadados falha', async () => {
  const removedPaths: string[] = [];
  const repository = createRepository({
    persistMetadata: async () => Promise.reject(new Error('Falha no banco')),
    remove: async (path) => {
      removedPaths.push(path);
    },
  });

  const result = await createOperations(repository).generateAndStore(makeProposal({
    pdf_storage_path: 'user-456/proposta-proposal-123.pdf',
  }));

  assert.equal(result, null);
  assert.deepEqual(removedPaths, []);
});

test('falha ao limpar arquivo antigo não invalida o novo PDF', async () => {
  const logs = { errors: [] as unknown[], warnings: [] as unknown[] };
  const repository = createRepository({
    remove: async () => Promise.reject(new Error('Falha de limpeza')),
  });

  const result = await createOperations(repository, logs).generateAndStore(makeProposal({
    pdf_storage_path: 'user-456/arquivo-antigo.pdf',
  }));

  assert.equal(result, 'https://secure.test/pdf?token=generated-token');
  assert.equal(logs.errors.length, 0);
  assert.equal(logs.warnings.length, 1);
});
