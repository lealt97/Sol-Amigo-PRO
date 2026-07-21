import { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { Onboarding } from './Onboarding';

export function FirstUseRoute() {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      window.location.replace('/login');
    } catch (error) {
      console.error('Erro ao sair durante o primeiro uso:', error);
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <Onboarding />
      <div className="fixed right-4 top-4 z-[70] sm:right-6 sm:top-6">
        <Button
          type="button"
          variant="outline"
          className="gap-2 bg-brand-surface/95 shadow-sm backdrop-blur"
          disabled={isSigningOut}
          onClick={() => void handleSignOut()}
        >
          {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {isSigningOut ? 'Saindo...' : 'Sair da conta'}
        </Button>
      </div>
    </>
  );
}
