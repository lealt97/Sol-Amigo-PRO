export type AssuranceLevel = string | null;

export type TotpFactor = {
  id: string;
  status: string;
  friendly_name?: string | null;
  created_at?: string;
};

export type TotpEnrollment = {
  id: string;
  totp: {
    qr_code: string;
    secret: string;
  };
};

type ErrorResult = {
  error: unknown;
};

type AssuranceResult = {
  data: {
    currentLevel: AssuranceLevel;
    nextLevel: AssuranceLevel;
  } | null;
  error: unknown;
};

export interface PasswordAuthApi {
  signInWithPassword(credentials: { email: string; password: string }): Promise<ErrorResult>;
  resetPasswordForEmail(email: string, options: { redirectTo: string }): Promise<ErrorResult>;
  updateUser(attributes: { password: string }): Promise<ErrorResult>;
}

export interface MfaApi {
  listFactors(): Promise<{
    data: { totp?: TotpFactor[] } | null;
    error: unknown;
  }>;
  challenge(input: { factorId: string }): Promise<{
    data: { id: string } | null;
    error: unknown;
  }>;
  verify(input: {
    factorId: string;
    challengeId: string;
    code: string;
  }): Promise<{
    data: unknown;
    error: unknown;
  }>;
  getAuthenticatorAssuranceLevel(): Promise<AssuranceResult>;
  enroll(input: {
    factorType: 'totp';
    friendlyName: string;
  }): Promise<{
    data: TotpEnrollment | null;
    error: unknown;
  }>;
  unenroll(input: { factorId: string }): Promise<ErrorResult>;
}

export interface RefreshableMfaAuthApi {
  mfa: MfaApi;
  refreshSession(): Promise<ErrorResult>;
}

function throwOperationError(error: unknown) {
  if (error) throw error;
}

export function getAuthErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code || '').toLowerCase();
  }
  return '';
}

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return String(error || '');
}

export async function loginWithPassword(
  auth: Pick<PasswordAuthApi, 'signInWithPassword'>,
  credentials: { email: string; password: string },
) {
  const result = await auth.signInWithPassword(credentials);
  throwOperationError(result.error);
}

export function buildPasswordResetRedirect(origin: string) {
  return `${origin.replace(/\/+$/, '')}/reset-password`;
}

export async function requestPasswordReset(
  auth: Pick<PasswordAuthApi, 'resetPasswordForEmail'>,
  email: string,
  origin: string,
) {
  const result = await auth.resetPasswordForEmail(email, {
    redirectTo: buildPasswordResetRedirect(origin),
  });
  throwOperationError(result.error);
}

export async function updateAccountPassword(
  auth: Pick<PasswordAuthApi, 'updateUser'>,
  password: string,
) {
  const result = await auth.updateUser({ password });
  throwOperationError(result.error);
}

export function normalizeTotpCode(value: string) {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function requireValidTotpCode(value: string) {
  const code = normalizeTotpCode(value);
  if (code.length !== 6) {
    throw new Error('Digite um código MFA válido de seis números.');
  }
  return code;
}

export function resolveMfaGateState(levels: {
  currentLevel: AssuranceLevel;
  nextLevel: AssuranceLevel;
}): 'required' | 'ready' {
  return levels.currentLevel === 'aal1' && levels.nextLevel === 'aal2' ? 'required' : 'ready';
}

export function getVerifiedTotpFactors(factors: TotpFactor[]) {
  return factors.filter((factor) => factor.status === 'verified');
}

export async function loadVerifiedTotpFactors(mfa: Pick<MfaApi, 'listFactors'>) {
  const result = await mfa.listFactors();
  throwOperationError(result.error);
  return getVerifiedTotpFactors(result.data?.totp || []);
}

export async function challengeAndVerifyTotp(
  mfa: Pick<MfaApi, 'challenge' | 'verify' | 'getAuthenticatorAssuranceLevel'>,
  factorId: string,
  rawCode: string,
) {
  const code = requireValidTotpCode(rawCode);
  const challenge = await mfa.challenge({ factorId });
  throwOperationError(challenge.error);

  if (!challenge.data?.id) {
    throw new Error('O Supabase não retornou um desafio MFA válido.');
  }

  const verification = await mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  throwOperationError(verification.error);

  const assurance = await mfa.getAuthenticatorAssuranceLevel();
  throwOperationError(assurance.error);
  if (!assurance.data || assurance.data.currentLevel !== 'aal2') {
    throw new Error('Não foi possível elevar a sessão para o nível de segurança MFA.');
  }

  return verification.data;
}

function defaultEnrollmentSuffix() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createUniqueTotpEnrollment(
  mfa: Pick<MfaApi, 'enroll'>,
  options: {
    baseName?: string;
    maxAttempts?: number;
    createSuffix?: () => string;
  } = {},
) {
  const baseName = options.baseName || 'SolAmigo Pro';
  const maxAttempts = options.maxAttempts || 3;
  const createSuffix = options.createSuffix || defaultEnrollmentSuffix;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await mfa.enroll({
      factorType: 'totp',
      friendlyName: `${baseName} ${createSuffix()}`,
    });

    if (!result.error && result.data) return result.data;

    lastError = result.error;
    if (getAuthErrorCode(result.error) !== 'mfa_factor_name_conflict') {
      throw result.error || new Error('O Supabase não retornou os dados da configuração MFA.');
    }
  }

  throw lastError || new Error('Não foi possível iniciar uma nova configuração MFA.');
}

export async function removeTotpFactor(
  mfa: Pick<MfaApi, 'unenroll'>,
  factorId: string,
  ignoreMissing = false,
) {
  const result = await mfa.unenroll({ factorId });
  if (ignoreMissing && getAuthErrorCode(result.error) === 'mfa_factor_not_found') return;
  throwOperationError(result.error);
}

export async function disableTotpFactors(
  auth: RefreshableMfaAuthApi,
  factorIds: string[],
  rawCode: string,
) {
  if (!factorIds.length) {
    throw new Error('Nenhum fator MFA verificado foi encontrado para desativação.');
  }

  await challengeAndVerifyTotp(auth.mfa, factorIds[0], rawCode);

  for (const factorId of factorIds) {
    await removeTotpFactor(auth.mfa, factorId);
  }

  const refresh = await auth.refreshSession();
  throwOperationError(refresh.error);
}

export function readableMfaError(error: unknown) {
  const message = getAuthErrorMessage(error);
  const normalized = message.toLowerCase();
  const code = getAuthErrorCode(error);

  if (code === 'mfa_totp_enroll_not_enabled' || normalized.includes('totp enroll not enabled')) {
    return 'O cadastro de MFA por aplicativo autenticador está desativado no projeto Supabase. Ative TOTP em Authentication > Multi-Factor Authentication.';
  }

  if (code === 'mfa_totp_verify_not_enabled' || normalized.includes('verification disabled')) {
    return 'A verificação MFA está desativada no projeto Supabase. Ative Challenge and Verify nas configurações de autenticação.';
  }

  if (code === 'mfa_challenge_expired' || normalized.includes('challenge expired')) {
    return 'A tentativa de verificação expirou. Aguarde o próximo código do aplicativo e tente novamente.';
  }

  if (
    code === 'mfa_verification_failed' ||
    normalized.includes('invalid code') ||
    normalized.includes('invalid totp') ||
    normalized.includes('verification failed')
  ) {
    return 'O código informado é inválido ou expirou. Digite o código atual do aplicativo autenticador.';
  }

  if (code === 'mfa_ip_address_mismatch') {
    return 'A ativação começou em outro endereço de rede. Cancele a configuração, permaneça na mesma conexão e tente novamente.';
  }

  if (
    code === 'insufficient_aal' ||
    normalized.includes('aal2') ||
    normalized.includes('assurance level')
  ) {
    return 'Confirme o código atual do aplicativo autenticador antes de desativar o MFA.';
  }

  if (code === 'too_many_enrolled_mfa_factors') {
    return 'Existem muitas tentativas MFA antigas vinculadas à conta. Remova os fatores pendentes no painel do Supabase antes de tentar novamente.';
  }

  if (code === 'mfa_factor_name_conflict') {
    return 'Não foi possível criar uma identificação única para esta tentativa de MFA. Tente novamente.';
  }

  return message || 'Não foi possível concluir a operação de autenticação em duas etapas.';
}
