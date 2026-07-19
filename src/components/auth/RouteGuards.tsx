import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { resolveMfaGateState } from '../../lib/auth/authFlows';
import { getMfaRecoveryCodeStatus } from '../../lib/auth/mfaRecovery';
import { supabase } from '../../lib/supabase/client';
import { MfaChallengeScreen } from './MfaChallengeScreen';
import { MfaRecoveryCodesSetupScreen } from './MfaRecoveryCodesSetupScreen';

type MfaGateState = 'checking' | 'required' | 'recovery-setup' | 'ready' | 'error';

export function ProtectedRoute() {
  const { session, isLoading, signOut } = useAuth();
  const [mfaGateState, setMfaGateState] = useState<MfaGateState>('checking');

  const evaluateMfaGate = useCallback(async () => {
    setMfaGateState('checking');

    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) {
      console.error('Erro ao verificar nível MFA da sessão:', error);
      setMfaGateState('error');
      return;
    }

    if (resolveMfaGateState(data) === 'required') {
      setMfaGateState('required');
      return;
    }

    if (data.currentLevel === 'aal2') {
      try {
        const recoveryStatus = await getMfaRecoveryCodeStatus();
        if (recoveryStatus.factorId && recoveryStatus.unusedCount === 0) {
          setMfaGateState('recovery-setup');
          return;
        }
      } catch (recoveryError) {
        console.error('Erro ao verificar códigos de recuperação MFA:', recoveryError);
        setMfaGateState('error');
        return;
      }
    }

    setMfaGateState('ready');
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!session) {
      setMfaGateState('checking');
      return () => {
        mounted = false;
      };
    }

    void (async () => {
      if (!mounted) return;
      await evaluateMfaGate();
    })();

    return () => {
      mounted = false;
    };
  }, [evaluateMfaGate, session?.access_token]);

  if (isLoading || (session && mfaGateState === 'checking')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-brand-gray">
        <div className="animate-pulse text-brand-blue">Verificando segurança da conta...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (mfaGateState === 'required') {
    return (
      <MfaChallengeScreen
        onSuccess={evaluateMfaGate}
        onSignOut={signOut}
      />
    );
  }

  if (mfaGateState === 'recovery-setup') {
    return (
      <MfaRecoveryCodesSetupScreen
        onComplete={() => setMfaGateState('ready')}
        onSignOut={signOut}
      />
    );
  }

  if (mfaGateState === 'error') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-brand-gray p-4">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-sm font-semibold text-red-700">Não foi possível validar a segurança desta sessão.</p>
          <p className="mt-2 text-xs text-red-600">Atualize a página. Caso o erro continue, saia da conta e entre novamente.</p>
          <button type="button" onClick={() => void signOut()} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-brand-gray">
        <div className="text-brand-blue animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
