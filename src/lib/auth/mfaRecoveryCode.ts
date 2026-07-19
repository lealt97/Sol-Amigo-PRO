export const MFA_RECOVERY_CODE_RAW_LENGTH = 24;
export const MFA_RECOVERY_CODE_GROUP_SIZE = 4;

export function normalizeMfaRecoveryCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-F0-9]/g, '')
    .slice(0, MFA_RECOVERY_CODE_RAW_LENGTH);
}

export function formatMfaRecoveryCode(value: string) {
  const normalized = normalizeMfaRecoveryCode(value);
  return normalized.match(new RegExp(`.{1,${MFA_RECOVERY_CODE_GROUP_SIZE}}`, 'g'))?.join('-') || '';
}

export function isValidMfaRecoveryCode(value: string) {
  return normalizeMfaRecoveryCode(value).length === MFA_RECOVERY_CODE_RAW_LENGTH;
}
