import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase/client';
import { MfaChallengeScreen } from './MfaChallengeScreen';

type MfaGateState = 'checking' | 'required' | 'ready' | 'error';

export function ProtectedRoute() {
  const { session, isLoading, signOut } = useAuth();
  const [mfaGateState, setMfaGateState] = useState<MfaGateState>('checking');

  useEffect(() => {
    let mounted = true;

    if (!session) {
      setMfaGateState('checking');
      return () => {
        mounted = false;
      };
    }

    setMfaGateState('checking');

    void (async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!mounted) return;

      if (error) {
        console.error('Erro ao verificar nível MFA da sessão:', error);
        setMfaGateState('error');
        return;
      }

      const needsSecondFactor = data.currentLevel === 'aal1' && data.nextLevel === 'aal2';
      setMfaGateState(needsSecondFactor ? 'required' : 'ready');
    })();

    return () => {
      mounted = false;
    };
  }, [session?.access_token]);

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
        onSuccess={() => setMfaGateState('ready')}
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
