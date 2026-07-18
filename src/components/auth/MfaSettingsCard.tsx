import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clipboard,
  KeyRound,
  Loader2,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase/client';
import { profileService } from '../../services/profileService';
import { Profile } from '../../types/profile';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';

type TotpFactor = {
  id: string;
  status: string;
  friendly_name?: string | null;
  created_at?: string;
};

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

interface MfaSettingsCardProps {
  userId: string;
  profile: Profile;
  onProfileChange: (profile: Profile) => void;
}

const codeInputClassName =
  'w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-center text-lg font-semibold tracking-[0.35em] text-brand-dark outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue';

function normalizeQrCode(qrCode: string) {
  const trimmed = qrCode.trim();
  if (trimmed.startsWith('<svg')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

function readableMfaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid') && normalized.includes('code')) {
    return 'O código informado é inválido ou já expirou. Digite o código atual do aplicativo autenticador.';
  }
  if (normalized.includes('verification disabled')) {
    return 'A verificação MFA está desativada no projeto Supabase. Ative a verificação TOTP nas configurações de autenticação.';
  }
  if (normalized.includes('aal2')) {
    return 'Confirme o segundo fator antes de remover a autenticação em duas etapas.';
  }
  return message || 'Não foi possível concluir a operação de autenticação em duas etapas.';
}

export function MfaSettingsCard({ userId, profile, onProfileChange }: MfaSettingsCardProps) {
  const [verifiedFactors, setVerifiedFactors] = useState<TotpFactor[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const enabled = verifiedFactors.length > 0;

  const loadFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;

    const factors = (data?.totp || []) as TotpFactor[];
    const verified = factors.filter((factor) => factor.status === 'verified');
    setVerifiedFactors(verified);
    return factors;
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const factors = await loadFactors();
        if (!mounted) return;
        setVerifiedFactors(factors.filter((factor) => factor.status === 'verified'));
      } catch (error) {
        if (mounted) setErrorMessage(readableMfaError(error));
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadFactors]);

  const persistProfileFlag = async (mfaEnabled: boolean) => {
    try {
      const updatedProfile = await profileService.updateProfile(userId, { mfa_enabled: mfaEnabled });
      onProfileChange(updatedProfile);
    } catch (error) {
      // Supabase Auth is the source of truth. Keep the screen correct even if the
      // optional profile mirror cannot be updated momentarily.
      console.warn('Não foi possível sincronizar mfa_enabled no perfil:', error);
      onProfileChange({ ...profile, mfa_enabled: mfaEnabled });
    }
  };

  const startEnrollment = async () => {
    setErrorMessage(null);
    setConfirmDisable(false);
    setIsWorking(true);

    try {
      const factors = await loadFactors();
      const alreadyVerified = factors.find((factor) => factor.status === 'verified');
      if (alreadyVerified) {
        setVerifiedFactors(factors.filter((factor) => factor.status === 'verified'));
        return;
      }

      // A cancelled setup leaves an unverified factor in Supabase. Remove stale
      // factors before creating a new QR code so repeated attempts stay clean.
      for (const factor of factors.filter((item) => item.status !== 'verified')) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (error) console.warn('Não foi possível remover fator MFA incompleto:', error);
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'SolAmigo Pro',
      });
      if (error) throw error;

      setEnrollment({
        factorId: data.id,
        qrCode: normalizeQrCode(data.totp.qr_code),
        secret: data.totp.secret,
      });
      setVerificationCode('');
    } catch (error) {
      setErrorMessage(readableMfaError(error));
    } finally {
      setIsWorking(false);
    }
  };

  const cancelEnrollment = async () => {
    const currentEnrollment = enrollment;
    setEnrollment(null);
    setVerificationCode('');
    setErrorMessage(null);

    if (!currentEnrollment) return;

    const { error } = await supabase.auth.mfa.unenroll({ factorId: currentEnrollment.factorId });
    if (error) console.warn('Não foi possível remover o fator MFA incompleto:', error);
  };

  const verifyEnrollment = async () => {
    if (!enrollment) return;

    const code = verificationCode.replace(/\D/g, '');
    if (code.length !== 6) {
      setErrorMessage('Digite os seis números exibidos no aplicativo autenticador.');
      return;
    }

    setErrorMessage(null);
    setIsWorking(true);

    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code,
      });
      if (error) throw error;

      await persistProfileFlag(true);
      await loadFactors();
      setEnrollment(null);
      setVerificationCode('');
      toast.success('Autenticação em duas etapas ativada com sucesso!');
    } catch (error) {
      setErrorMessage(readableMfaError(error));
    } finally {
      setIsWorking(false);
    }
  };

  const disableMfa = async () => {
    if (!verifiedFactors.length) return;

    setErrorMessage(null);
    setIsWorking(true);

    try {
      for (const factor of verifiedFactors) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (error) throw error;
      }

      await supabase.auth.refreshSession();
      await persistProfileFlag(false);
      setVerifiedFactors([]);
      setConfirmDisable(false);
      toast.success('Autenticação em duas etapas desativada.');
    } catch (error) {
      setErrorMessage(readableMfaError(error));
    } finally {
      setIsWorking(false);
    }
  };

  const copySecret = async () => {
    if (!enrollment?.secret) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      toast.success('Chave copiada!');
    } catch {
      toast.error('Não foi possível copiar a chave automaticamente.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-brand-blue" />
          Segurança
        </CardTitle>
        <CardDescription>Gerencie a autenticação em duas etapas da sua conta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-brand-dark">Autenticação em Duas Etapas (MFA)</h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Exige um código temporário do Google Authenticator, Microsoft Authenticator, Authy ou aplicativo compatível após a senha.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className={`text-xs font-medium ${enabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                {isLoading ? 'Verificando...' : enabled ? 'Ativado' : 'Desativado'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={enabled ? 'Desativar autenticação em duas etapas' : 'Ativar autenticação em duas etapas'}
                disabled={isLoading || isWorking}
                onClick={() => {
                  if (enabled) setConfirmDisable(true);
                  else void startEnrollment();
                }}
                className={`relative flex h-6 w-10 items-center rounded-full px-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${enabled ? 'bg-brand-blue' : 'bg-slate-300'}`}
              >
                <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Consultando os fatores de segurança da conta...
            </div>
          )}

          {enabled && !confirmDisable && !enrollment && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">Sua conta está protegida por MFA.</p>
                <p className="mt-1 text-xs">Nos próximos logins, o sistema solicitará o código atual do aplicativo autenticador.</p>
              </div>
            </div>
          )}

          {confirmDisable && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3 text-amber-900">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Desativar a proteção em duas etapas?</p>
                  <p className="mt-1 text-xs leading-relaxed">A conta voltará a depender apenas da senha para entrar.</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" disabled={isWorking} onClick={() => setConfirmDisable(false)}>
                  Cancelar
                </Button>
                <Button type="button" variant="destructive" disabled={isWorking} onClick={() => void disableMfa()} className="gap-2">
                  {isWorking && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar desativação
                </Button>
              </div>
            </div>
          )}

          {enrollment && (
            <div className="mt-4 space-y-4 border-t border-brand-border pt-4">
              <div className="flex items-start gap-3">
                <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue" />
                <div>
                  <p className="text-sm font-semibold text-brand-dark">Configure o aplicativo autenticador</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Escaneie o QR Code, ou use a chave manual, e depois confirme com o código de seis números gerado no celular.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[190px_minmax(0,1fr)] md:items-center">
                <div className="flex min-h-44 items-center justify-center rounded-xl border border-brand-border bg-white p-3">
                  <img src={enrollment.qrCode} alt="QR Code para configurar autenticação em duas etapas" className="h-40 w-40 object-contain" />
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs font-medium text-brand-dark">
                      <KeyRound className="h-4 w-4 text-brand-blue" />
                      Chave para configuração manual
                    </p>
                    <div className="flex items-center gap-2 rounded-lg border border-brand-border bg-gray-50 p-2">
                      <code className="min-w-0 flex-1 break-all text-xs text-brand-dark">{enrollment.secret}</code>
                      <button type="button" onClick={() => void copySecret()} className="rounded-md p-2 text-slate-500 hover:bg-white hover:text-brand-blue" title="Copiar chave">
                        <Clipboard className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="mfa-enrollment-code" className="mb-2 block text-xs font-medium text-brand-dark">
                      Código de confirmação
                    </label>
                    <input
                      id="mfa-enrollment-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className={codeInputClassName}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" disabled={isWorking} onClick={() => void cancelEnrollment()}>
                  Cancelar configuração
                </Button>
                <Button type="button" disabled={isWorking || verificationCode.length !== 6} onClick={() => void verifyEnrollment()} className="gap-2">
                  {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Ativar MFA
                </Button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
