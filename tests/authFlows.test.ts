import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  MfaApi,
  RefreshableMfaAuthApi,
  buildPasswordResetRedirect,
  challengeAndVerifyTotp,
  createUniqueTotpEnrollment,
  disableTotpFactors,
  getVerifiedTotpFactors,
  loadVerifiedTotpFactors,
  loginWithPassword,
  normalizeTotpCode,
  readableMfaError,
  requestPasswordReset,
  resolveMfaGateState,
  updateAccountPassword,
} from '../src/lib/auth/authFlows';
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '../src/lib/validations/auth.schema';

function createMfaMock(overrides: Partial<MfaApi> = {}): MfaApi {
  return {
    listFactors: async () => ({ data: { totp: [] }, error: null }),
    challenge: async () => ({ data: { id: 'challenge-1' }, error: null }),
    verify: async () => ({ data: { verified: true }, error: null }),
    getAuthenticatorAssuranceLevel: async () => ({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    }),
    enroll: async () => ({
      data: {
        id: 'factor-new',
        totp: { qr_code: '<svg></svg>', secret: 'SECRET' },
      },
      error: null,
    }),
    unenroll: async () => ({ error: null }),
    ...overrides,
  };
}

test('valida os dados mínimos de login e recuperação de senha', () => {
  assert.equal(loginSchema.safeParse({ email: 'usuario@empresa.com', password: '123456' }).success, true);
  assert.equal(loginSchema.safeParse({ email: 'invalido', password: '123' }).success, false);
  assert.equal(forgotPasswordSchema.safeParse({ email: 'usuario@empresa.com' }).success, true);
  assert.equal(forgotPasswordSchema.safeParse({ email: 'sem-arroba' }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ password: '123456', confirmPassword: '123456' }).success, true);
  assert.equal(resetPasswordSchema.safeParse({ password: '123456', confirmPassword: '654321' }).success, false);
});

test('executa o login com as credenciais informadas', async () => {
  let received: { email: string; password: string } | null = null;
  const auth = {
    async signInWithPassword(credentials: { email: string; password: string }) {
      received = credentials;
      return { error: null };
    },
  };

  await loginWithPassword(auth, {
    email: 'usuario@empresa.com',
    password: 'senha-segura',
  });

  assert.deepEqual(received, {
    email: 'usuario@empresa.com',
    password: 'senha-segura',
  });
});

test('propaga a falha retornada pelo provedor durante o login', async () => {
  const expectedError = new Error('Invalid login credentials');
  const auth = {
    async signInWithPassword() {
      return { error: expectedError };
    },
  };

  await assert.rejects(
    () => loginWithPassword(auth, { email: 'usuario@empresa.com', password: 'errada' }),
    expectedError,
  );
});

test('monta o redirecionamento e solicita recuperação de senha sem barra duplicada', async () => {
  assert.equal(buildPasswordResetRedirect('https://app.solamigo.com.br/'), 'https://app.solamigo.com.br/reset-password');

  let receivedEmail = '';
  let receivedRedirect = '';
  const auth = {
    async resetPasswordForEmail(email: string, options: { redirectTo: string }) {
      receivedEmail = email;
      receivedRedirect = options.redirectTo;
      return { error: null };
    },
  };

  await requestPasswordReset(auth, 'usuario@empresa.com', 'https://app.solamigo.com.br/');
  assert.equal(receivedEmail, 'usuario@empresa.com');
  assert.equal(receivedRedirect, 'https://app.solamigo.com.br/reset-password');
});

test('atualiza a senha da conta e propaga falhas do provedor', async () => {
  let receivedPassword = '';
  const successAuth = {
    async updateUser(attributes: { password: string }) {
      receivedPassword = attributes.password;
      return { error: null };
    },
  };

  await updateAccountPassword(successAuth, 'nova-senha');
  assert.equal(receivedPassword, 'nova-senha');

  const failure = new Error('Password update failed');
  const failingAuth = {
    async updateUser() {
      return { error: failure };
    },
  };
  await assert.rejects(() => updateAccountPassword(failingAuth, 'nova-senha'), failure);
});

test('decide corretamente quando a sessão deve solicitar o segundo fator', () => {
  assert.equal(resolveMfaGateState({ currentLevel: 'aal1', nextLevel: 'aal2' }), 'required');
  assert.equal(resolveMfaGateState({ currentLevel: 'aal2', nextLevel: 'aal2' }), 'ready');
  assert.equal(resolveMfaGateState({ currentLevel: 'aal1', nextLevel: 'aal1' }), 'ready');
});

test('normaliza códigos TOTP e seleciona somente fatores verificados', async () => {
  assert.equal(normalizeTotpCode('12a 34-567'), '123456');

  const factors = [
    { id: 'pending', status: 'unverified' },
    { id: 'verified', status: 'verified' },
  ];
  assert.deepEqual(getVerifiedTotpFactors(factors), [{ id: 'verified', status: 'verified' }]);

  const loaded = await loadVerifiedTotpFactors(createMfaMock({
    listFactors: async () => ({ data: { totp: factors }, error: null }),
  }));
  assert.deepEqual(loaded, [{ id: 'verified', status: 'verified' }]);
});

test('executa desafio e verificação MFA e exige elevação para AAL2', async () => {
  const calls: string[] = [];
  const mfa = createMfaMock({
    challenge: async ({ factorId }: { factorId: string }) => {
      calls.push(`challenge:${factorId}`);
      return { data: { id: 'challenge-123' }, error: null };
    },
    verify: async ({ factorId, challengeId, code }) => {
      calls.push(`verify:${factorId}:${challengeId}:${code}`);
      return { data: { verified: true }, error: null };
    },
    getAuthenticatorAssuranceLevel: async () => {
      calls.push('aal');
      return { data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null };
    },
  });

  await challengeAndVerifyTotp(mfa, 'factor-1', '123 456');
  assert.deepEqual(calls, [
    'challenge:factor-1',
    'verify:factor-1:challenge-123:123456',
    'aal',
  ]);
});

test('rejeita código MFA incompleto antes de chamar o provedor', async () => {
  let called = false;
  const mfa = createMfaMock({
    challenge: async () => {
      called = true;
      return { data: { id: 'challenge-1' }, error: null };
    },
  });

  await assert.rejects(() => challengeAndVerifyTotp(mfa, 'factor-1', '123'), /seis números/);
  assert.equal(called, false);
});

test('rejeita uma verificação que não elevou a sessão para AAL2', async () => {
  const mfa = createMfaMock({
    getAuthenticatorAssuranceLevel: async () => ({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    }),
  });

  await assert.rejects(
    () => challengeAndVerifyTotp(mfa, 'factor-1', '123456'),
    /elevar a sessão/,
  );
});

test('cria fator TOTP com nome único e repete somente em conflito de nome', async () => {
  const names: string[] = [];
  const suffixes = ['primeira', 'segunda'];
  let attempt = 0;
  const mfa = createMfaMock({
    enroll: async ({ friendlyName }: { factorType: 'totp'; friendlyName: string }) => {
      names.push(friendlyName);
      attempt += 1;
      if (attempt === 1) {
        return {
          data: null,
          error: { code: 'mfa_factor_name_conflict', message: 'Name conflict' },
        };
      }
      return {
        data: {
          id: 'factor-new',
          totp: { qr_code: '<svg></svg>', secret: 'SECRET' },
        },
        error: null,
      };
    },
  });

  const enrollment = await createUniqueTotpEnrollment(mfa, {
    createSuffix: () => suffixes.shift() || 'extra',
  });

  assert.equal(enrollment.id, 'factor-new');
  assert.deepEqual(names, ['SolAmigo Pro primeira', 'SolAmigo Pro segunda']);
});

test('desativa todos os fatores somente após confirmar o código atual', async () => {
  const calls: string[] = [];
  const mfa = createMfaMock({
    challenge: async ({ factorId }: { factorId: string }) => {
      calls.push(`challenge:${factorId}`);
      return { data: { id: 'challenge-disable' }, error: null };
    },
    verify: async ({ factorId, code }) => {
      calls.push(`verify:${factorId}:${code}`);
      return { data: { verified: true }, error: null };
    },
    getAuthenticatorAssuranceLevel: async () => {
      calls.push('aal2');
      return { data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null };
    },
    unenroll: async ({ factorId }: { factorId: string }) => {
      calls.push(`unenroll:${factorId}`);
      return { error: null };
    },
  });
  const auth: RefreshableMfaAuthApi = {
    mfa,
    refreshSession: async () => {
      calls.push('refresh');
      return { error: null };
    },
  };

  await disableTotpFactors(auth, ['factor-1', 'factor-2'], '123456');
  assert.deepEqual(calls, [
    'challenge:factor-1',
    'verify:factor-1:123456',
    'aal2',
    'unenroll:factor-1',
    'unenroll:factor-2',
    'refresh',
  ]);
});

test('traduz os principais erros de MFA para mensagens acionáveis', () => {
  assert.match(
    readableMfaError({ code: 'mfa_totp_enroll_not_enabled', message: 'disabled' }),
    /Ative TOTP/,
  );
  assert.match(
    readableMfaError({ code: 'mfa_verification_failed', message: 'verification failed' }),
    /inválido ou expirou/,
  );
  assert.match(
    readableMfaError({ code: 'insufficient_aal', message: 'insufficient aal' }),
    /Confirme o código atual/,
  );
});
