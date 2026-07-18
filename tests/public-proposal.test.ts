import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPublicProposalOperations,
  InvalidPublicProposalTokenError,
  normalizePublicProposalReason,
  normalizePublicProposalToken,
  normalizePublicProposalUserAgent,
  type PublicProposalPayload,
  type PublicProposalRepository,
} from '../src/lib/public-proposals/publicProposalOperations';

const VALID_TOKEN = '1234567890abcdef1234567890abcdef';

function createRepository(
  overrides: Partial<PublicProposalRepository> = {},
): PublicProposalRepository {
  return {
    fetchByToken: async () => ({
      id: 'proposal-1',
      status: 'viewed',
      pdf_available: false,
    }),
    createSignedPdfUrl: async () => 'https://signed.test/proposal.pdf',
    updateStatus: async (input) => ({ status: input.status }),
    ...overrides,
  };
}

test('normaliza somente tokens públicos com comprimento permitido', () => {
  assert.equal(normalizePublicProposalToken(`  ${VALID_TOKEN}  `), VALID_TOKEN);
  assert.equal(normalizePublicProposalToken('curto'), null);
  assert.equal(normalizePublicProposalToken('x'.repeat(129)), null);
  assert.equal(normalizePublicProposalToken(null), null);
});

test('normaliza motivo de recusa e limita o conteúdo a mil caracteres', () => {
  assert.equal(normalizePublicProposalReason('approved', 'não deve seguir'), null);
  assert.equal(normalizePublicProposalReason('rejected', '  Valor alto  '), 'Valor alto');
  assert.equal(normalizePublicProposalReason('rejected', '   '), null);
  assert.equal(normalizePublicProposalReason('rejected', 'x'.repeat(1200))?.length, 1000);
});

test('normaliza e limita o user agent enviado ao RPC', () => {
  assert.equal(normalizePublicProposalUserAgent('  Navegador Solar  '), 'Navegador Solar');
  assert.equal(normalizePublicProposalUserAgent(''), null);
  assert.equal(normalizePublicProposalUserAgent('x'.repeat(700))?.length, 512);
});

test('token inválido não consulta o repositório', async () => {
  let fetched = false;
  const operations = createPublicProposalOperations(createRepository({
    fetchByToken: async () => {
      fetched = true;
      return null;
    },
  }));

  const proposal = await operations.getProposalByToken('inválido');

  assert.equal(proposal, null);
  assert.equal(fetched, false);
});

test('retorna null quando a proposta pública não existe', async () => {
  const operations = createPublicProposalOperations(createRepository({
    fetchByToken: async () => null,
  }));

  assert.equal(await operations.getProposalByToken(VALID_TOKEN), null);
});

test('carrega proposta sem solicitar URL quando o PDF não está disponível', async () => {
  let signedUrlRequested = false;
  const payload: PublicProposalPayload = {
    id: 'proposal-1',
    status: 'viewed',
    pdf_available: false,
  };
  const operations = createPublicProposalOperations(createRepository({
    fetchByToken: async () => payload,
    createSignedPdfUrl: async () => {
      signedUrlRequested = true;
      return 'https://signed.test/proposal.pdf';
    },
  }));

  const proposal = await operations.getProposalByToken(VALID_TOKEN);

  assert.equal(proposal?.id, 'proposal-1');
  assert.equal(proposal?.pdf_url, null);
  assert.equal(signedUrlRequested, false);
});

test('anexa URL temporária quando o PDF privado está disponível', async () => {
  const operations = createPublicProposalOperations(createRepository({
    fetchByToken: async () => ({
      id: 'proposal-1',
      status: 'viewed',
      pdf_available: true,
    }),
  }));

  const proposal = await operations.getProposalByToken(VALID_TOKEN);

  assert.equal(proposal?.pdf_url, 'https://signed.test/proposal.pdf');
});

test('falha ao assinar o PDF não impede a visualização da proposta', async () => {
  const warnings: unknown[] = [];
  const operations = createPublicProposalOperations(
    createRepository({
      fetchByToken: async () => ({
        id: 'proposal-1',
        status: 'viewed',
        pdf_available: true,
      }),
      createSignedPdfUrl: async () => Promise.reject(new Error('Storage indisponível')),
    }),
    {
      warn: (_message, error) => warnings.push(error),
    },
  );

  const proposal = await operations.getProposalByToken(VALID_TOKEN);

  assert.equal(proposal?.id, 'proposal-1');
  assert.equal(proposal?.pdf_url, null);
  assert.equal(warnings.length, 1);
});

test('propaga erro do RPC de carregamento', async () => {
  const error = new Error('Falha no RPC');
  const operations = createPublicProposalOperations(createRepository({
    fetchByToken: async () => Promise.reject(error),
  }));

  await assert.rejects(() => operations.getProposalByToken(VALID_TOKEN), error);
});

test('aprova a proposta com token e user agent normalizados', async () => {
  let received: Parameters<PublicProposalRepository['updateStatus']>[0] | null = null;
  const operations = createPublicProposalOperations(createRepository({
    updateStatus: async (input) => {
      received = input;
      return { status: input.status };
    },
  }));

  const result = await operations.updateStatus(
    `  ${VALID_TOKEN}  `,
    'approved',
    'motivo ignorado',
    '  Chrome Solar  ',
  );

  assert.deepEqual(received, {
    token: VALID_TOKEN,
    status: 'approved',
    reason: null,
    userAgent: 'Chrome Solar',
  });
  assert.deepEqual(result, { status: 'approved' });
});

test('recusa a proposta com motivo sanitizado', async () => {
  let receivedReason: string | null = null;
  const operations = createPublicProposalOperations(createRepository({
    updateStatus: async (input) => {
      receivedReason = input.reason;
      return { status: input.status };
    },
  }));

  await operations.updateStatus(
    VALID_TOKEN,
    'rejected',
    `  ${'x'.repeat(1100)}  `,
    null,
  );

  assert.equal(receivedReason?.length, 1000);
});

test('impede atualização com token inválido antes de chamar o RPC', async () => {
  let updated = false;
  const operations = createPublicProposalOperations(createRepository({
    updateStatus: async () => {
      updated = true;
      return null;
    },
  }));

  await assert.rejects(
    () => operations.updateStatus('curto', 'approved'),
    InvalidPublicProposalTokenError,
  );
  assert.equal(updated, false);
});

test('propaga recusa do banco para proposta já finalizada ou inexistente', async () => {
  const error = new Error('Proposta não disponível para avaliação');
  const operations = createPublicProposalOperations(createRepository({
    updateStatus: async () => Promise.reject(error),
  }));

  await assert.rejects(
    () => operations.updateStatus(VALID_TOKEN, 'approved'),
    error,
  );
});
