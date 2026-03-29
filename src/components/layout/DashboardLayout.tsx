import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Calendar,
  History,
  User,
  LogOut,
  Menu,
  X,
  Building2,
  Bell,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Crown,
  Receipt,
  Gift
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut, loading, impersonatedOrgId, setImpersonatedOrgId } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const navigate = useNavigate();

  const orgId = (profile?.organization_id || impersonatedOrgId) as string | undefined;

  // Determinar roles (considerando estado de carga)
  const isAdmin = !loading && (profile?.role === 'admin' || profile?.role === 'super_admin');
  const isSuperAdmin = !loading && profile?.role === 'super_admin';
  const { status: subscriptionStatus, latestEndDate } = useSubscriptionStatus(orgId);

  // Modo soporte: super_admin con organization impersonada - debe definirse ANTES del useEffect
  const isInSupportMode = isSuperAdmin && impersonatedOrgId !== null;

  useEffect(() => {
    if (profile?.organization_id) {
      fetchOrganization(profile.organization_id);
    }
  }, [profile?.organization_id]);



  const fetchOrganization = async (orgId: string) => {
    setOrgLoading(true);
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    if (data) {
      setOrganization(data);
    }
    setOrgLoading(false);
  };

  const handleSignOut = async () => {
    const slug = organization?.slug;
    const wasInSupportMode = isInSupportMode;

    // Limpiar modo soporte antes de cerrar sesión
    if (wasInSupportMode) {
      setImpersonatedOrgId(null);
    }

    // Guardar el slug en localStorage para recordar la organización
    if (slug) {
      localStorage.setItem('lastOrganizationSlug', slug);
    }

    await signOut();

    if (wasInSupportMode) {
      navigate('/super-admin/organizations');
    } else if (profile?.role === 'super_admin') {
      navigate('/');
    } else if (slug) {
      navigate(`/${slug}/login`);
    } else {
      navigate('/');
    }
  };

  let navItems = [
    { name: 'Calendario', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Reservar', path: '/reservations/new', icon: Calendar },
    { name: 'Mis Reservas', path: '/reservations/my', icon: History },
    { name: 'Mantenimientos', path: '/maintenance', icon: Bell },
    { name: 'Mi Perfil', path: '/profile', icon: User },
  ];

  if (organization?.bonus_system_active) {
    navItems.splice(3, 0, { name: 'Bonificaciones', path: '/bonificaciones', icon: Gift });
  }

  // Layout minimalista para super_admin sin modo soporte
  if (isSuperAdmin && !isInSupportMode) {
    navItems = [
      { name: 'Organizaciones', path: '/super-admin/organizations', icon: Building2 },
      { name: 'Planes de Suscripción', path: '/super-admin/subscription-plans', icon: Crown },
      { name: 'Pagos de Suscripción', path: '/super-admin/subscription-payments', icon: Receipt },
    ];
  } else if (isAdmin) {
    const adminItems = [
      { name: 'Dashboard (informes)', path: '/admin', icon: LayoutDashboard },
      { name: 'Calendario (reservas)', path: '/dashboard', icon: Calendar },
      { name: 'Gestión Reservas', path: '/admin/reservations', icon: Calendar },
      { name: 'Áreas Comunes', path: '/admin/areas', icon: Building2 },
      { name: 'Usuarios', path: '/admin/users', icon: User },
      { name: 'Suscripción', path: '/admin/subscription', icon: Crown },
      { name: 'Bonificaciones', path: '/admin/bonificaciones', icon: Gift },
    ];

    // Si es super_admin y está en modo soporte, añadir gestión de organizaciones al principio
    if (isSuperAdmin && isInSupportMode) {
      adminItems.unshift({ name: 'Gestión Organizaciones', path: '/super-admin/organizations', icon: Building2 });
    }

    navItems = [...adminItems, { name: 'Reservar', path: '/reservations/new', icon: Calendar }, { name: 'Mantenimientos', path: '/maintenance', icon: Bell }, { name: 'Mi Perfil', path: '/profile', icon: User }];
  }

  // Función para salir del modo soporte
  const handleExitSupport = () => {
    setImpersonatedOrgId(null);
    navigate('/super-admin/organizations');
  };



  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2 overflow-hidden">
              {orgLoading ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              ) : organization?.logo_url ? (
                <img src={organization.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
              ) : (
                <Building2 className="w-6 h-6 text-primary" />
              )}
              <h1 className="text-xl font-bold text-gray-900 tracking-tight truncate">
                {organization?.name || 'GoGi Reservas'}
              </h1>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Banner de Modo Soporte */}
          {isInSupportMode && (
            <div className="px-4 py-3 mx-4 mb-2 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-800">Modo Soporte Activo</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Salir del modo soporte y volver a la gestión de organizaciones"
                  onClick={handleExitSupport}
                  className="text-xs h-7 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Salir
                </Button>
              </div>
            </div>
          )}

          <nav className="flex-1 px-4 space-y-1 mt-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/5 text-primary"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            ))}

            {/* Usuario y Cerrar Sesión - visible para todos los usuarios */}
            {profile && !loading && (
              <>
                <div className="pt-4 pb-2 border-t border-gray-200">
                  <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-md">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">{profile?.full_name?.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name}</p>
                      <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </>
            )}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2 overflow-hidden">
            {organization?.logo_url ? (
              <img src={organization.logo_url} alt="Logo" className="w-6 h-6 object-contain" />
            ) : (
              <Building2 className="w-6 h-6 text-primary" />
            )}
            <span className="font-bold text-gray-900 truncate">{organization?.name || 'GoGi Reservas'}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {subscriptionStatus === 'pending_validation' && isAdmin && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Tu suscripción requiere validación</p>
                    <p className="text-xs text-amber-600">Contacta al administrador para completar el proceso de activación.</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate('/admin/subscription')} className="bg-amber-600 hover:bg-amber-700 text-white">
                  Ver Detalles
                </Button>
              </div>
            )}
            {subscriptionStatus === 'past_due' && isAdmin && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-800">Tu suscripción está vencida</p>
                    <p className="text-xs text-red-600">
                      {(() => {
                        if (latestEndDate) {
                          const endDate = new Date(latestEndDate);
                          const now = new Date();
                          const daysSinceExpiry = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
                          const daysUntilSuspension = Math.max(0, 20 - daysSinceExpiry);
                          if (daysUntilSuspension === 0) {
                            return 'El servicio de reservas está suspendido.';
                          }
                          return `Renueva ahora. El servicio de reservas se suspenderá en ${daysUntilSuspension} días.`;
                        }
                        return 'Renueva ahora para restaurar el acceso completo a la plataforma.';
                      })()}
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate('/admin/subscription')} className="bg-red-600 hover:bg-red-700 text-white">
                  Renovar
                </Button>
              </div>
            )}
            {subscriptionStatus === 'cancelled' && isAdmin && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <ShieldAlert className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Tu suscripción ha sido cancelada</p>
                    <p className="text-xs text-gray-600">Contacta al administrador para reactivar tu cuenta.</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate('/admin/subscription')} className="bg-gray-600 hover:bg-gray-700 text-white">
                  Reactivar
                </Button>
              </div>
            )}
            {children}
          </div>
        </div>
      </main>



      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
