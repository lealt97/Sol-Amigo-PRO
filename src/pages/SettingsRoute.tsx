import { MouseEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Configuracoes } from './Configuracoes';

export function SettingsRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (searchParams.get('tab') === 'encerramento') {
    return <Navigate to="/privacidade-dados" replace />;
  }

  const handleCapture = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest('button');
    if (!button || !button.textContent?.includes('Encerramento da Conta')) return;

    event.preventDefault();
    event.stopPropagation();
    navigate('/privacidade-dados');
  };

  return (
    <div onClickCapture={handleCapture}>
      <Configuracoes />
    </div>
  );
}
