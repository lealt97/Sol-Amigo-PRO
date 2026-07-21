import { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Database, FileText, LayoutDashboard, LogOut, Menu, Package, PenTool, Settings, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { AnimatedNavbarLogo } from "./brand/AnimatedNavbarLogo";
import { profileService } from "../services/profileService";
import { adminService } from "../services/adminService";
import { Profile } from "../types/profile";

export function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [navbarProfile, setNavbarProfile] = useState<Pick<Profile, 'id' | 'name' | 'company_name' | 'seller_name' | 'avatar_url'> | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setNavbarProfile(null);
      return;
    }

    let mounted = true;
    void profileService.getProfile(user.id)
      .then((profile) => {
        if (mounted) setNavbarProfile(profile);
      })
      .catch((error) => {
        console.warn('Não foi possível carregar o perfil da navbar:', error);
      });

    const handleProfileUpdated = (event: Event) => {
      const nextProfile = (event as CustomEvent<Profile>).detail;
      if (nextProfile?.id === user.id) setNavbarProfile(nextProfile);
    };

    window.addEventListener('solamigo:profile-updated', handleProfileUpdated);
    return () => {
      mounted = false;
      window.removeEventListener('solamigo:profile-updated', handleProfileUpdated);
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setIsAdmin(false);
      return;
    }

    void adminService.getMe()
      .then(() => {
        if (active) setIsAdmin(true);
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const displayName = navbarProfile?.seller_name || navbarProfile?.name || user?.user_metadata?.name || 'Usuário';
  const displayCompany = navbarProfile?.company_name || user?.user_metadata?.company_name || 'SolAmigo Pro';
  const avatarUrl = navbarProfile?.avatar_url || user?.user_metadata?.avatar_url || null;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUrl]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/primeiros-passos', label: 'Primeiros Passos', icon: Sparkles },
    { path: '/clientes', label: 'Clientes', icon: Users },
    { path: '/propostas', label: 'Propostas', icon: FileText },
    { path: '/kits-solares', label: 'Kits Solares', icon: Package },
    { path: '/design-pdf', label: 'Design PDF', icon: PenTool },
    { path: '/configuracoes', label: 'Configurações da Conta', icon: Settings },
    { path: '/privacidade-dados', label: 'Privacidade e Dados', icon: Database },
    ...(isAdmin ? [{ path: '/admin', label: 'Administração', icon: ShieldCheck }] : []),
  ];

  const getPageTitle = () => {
    const currentItem = navItems.find(item => item.path === location.pathname);
    return currentItem ? currentItem.label : 'Visão Geral';
  };

  return (
    <div className="flex h-screen w-full bg-brand-gray text-brand-dark font-sans overflow-hidden">
      <aside className={`${isSidebarExpanded ? "w-64" : "w-20"} transition-all duration-300 border-r border-brand-border bg-brand-surface flex flex-col shrink-0`}>
        <div className={`p-6 ${isSidebarExpanded ? "" : "px-4"}`}>
          <Link
            to="/dashboard"
            aria-label="Ir para o Dashboard"
            className={`mb-8 flex items-center rounded-xl transition-opacity hover:opacity-90 ${
              isSidebarExpanded ? "px-3" : "justify-center"
            }`}
          >
            <AnimatedNavbarLogo className={`${isSidebarExpanded ? "h-14 w-14" : "h-12 w-12"} shrink-0`} />
          </Link>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center overflow-hidden rounded-md transition-colors ${
                    isSidebarExpanded ? "gap-3 px-3 py-2" : "justify-center p-2"
                  } ${
                    isActive
                      ? "bg-gray-50 text-brand-dark"
                      : "text-slate-500 hover:text-brand-dark hover:bg-gray-50/50"
                  }`}
                  title={!isSidebarExpanded ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? "opacity-100 text-brand-blue" : "opacity-70"}`} />
                  {isSidebarExpanded && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className={`mt-auto p-4 border-t border-brand-border space-y-4 ${!isSidebarExpanded ? "px-2" : ""}`}>
          <div className={`bg-gray-50 rounded-lg flex items-center ${isSidebarExpanded ? "p-3 gap-3" : "p-2 flex-col gap-2 justify-center"}`}>
            {avatarUrl && !avatarLoadFailed ? (
              <img
                src={avatarUrl}
                alt={`Foto de perfil de ${displayName}`}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-brand-border"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-blue to-brand-blue-hover flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                {displayName.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
            )}
            {isSidebarExpanded && (
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-medium text-brand-dark truncate">{displayName}</p>
                <p className="text-[10px] text-slate-500 truncate">{displayCompany}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors shrink-0 ${!isSidebarExpanded ? "w-full flex justify-center" : ""}`}
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-brand-border flex items-center px-8 bg-brand-surface shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              className="p-1.5 -ml-2 text-slate-500 hover:text-brand-dark hover:bg-gray-100 rounded-md transition-colors"
              title={isSidebarExpanded ? "Recolher menu" : "Expandir menu"}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-medium text-brand-dark">{getPageTitle()}</h2>
            <div className="h-4 w-[1px] bg-gray-100 hidden sm:block"></div>
            <span className="text-xs text-slate-500 hidden sm:block">SaaS SolAmigo FV</span>
          </div>
        </header>
        <div className="p-8 flex-1 overflow-auto flex flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
