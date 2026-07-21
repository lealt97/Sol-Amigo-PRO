import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { firstUseService } from '../../services/firstUseService';

export function FirstUseGate() {
  const { user } = useAuth();

  if (!user) return null;

  if (firstUseService.requiresFirstUse(user)) {
    return <Navigate to="/primeiros-passos" replace />;
  }

  return <Outlet />;
}
