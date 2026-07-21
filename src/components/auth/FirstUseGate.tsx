import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { firstUseService } from '../../services/firstUseService';

export function FirstUseGate() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;
  if (location.pathname === '/primeiros-passos') return <Outlet />;

  if (firstUseService.requiresFirstUse(user)) {
    return <Navigate to="/primeiros-passos" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
