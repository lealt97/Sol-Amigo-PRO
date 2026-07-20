import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { adminService } from '../../services/adminService';

export function AdminRoute() {
  const [state, setState] = useState<'checking' | 'authorized' | 'denied'>('checking');

  useEffect(() => {
    let active = true;
    void adminService.getMe()
      .then(() => {
        if (active) setState('authorized');
      })
      .catch(() => {
        if (active) setState('denied');
      });

    return () => {
      active = false;
    };
  }, []);

  if (state === 'checking') {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-brand-blue animate-pulse">Validando acesso administrativo...</div>;
  }

  if (state === 'denied') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
