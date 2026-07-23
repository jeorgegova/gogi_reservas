import { useNavigate, NavLink, useLocation } from 'react-router-dom';
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
  Gift,
  Settings,
  Plus,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Users,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { getTerminology } from '@/lib/terminology';
import { AuthModal } from '../auth/AuthModal';
import { PwaInstallProvider } from '../pwa/PwaInstallContext';
import { PwaInstallButton } from '../pwa/PwaInstallButton';

type DashboardNavItem = {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  locked?: boolean;
};

type DashboardOrganization = {
  id: string;
  name?: string | null;
  slug?: string | null;
  logo_url?: string | null;
  business_type?: string | null;
  bonus_system_active?: boolean | null;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut, loading, impersonatedOrgId, setImpersonatedOrgId, isGuest, openAuthModal, businessType } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [organization, setOrganization] = useState<DashboardOrganization | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newReservationBanner, setNewReservationBanner] = useState<{ id: string; clientName: string; resourceName: string } | null>(null);
  const [pendingAdminReservationsCount, setPendingAdminReservationsCount] = useState(0);
  const latestAdminReservationIdRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const orgId = (profile?.organization_id || impersonatedOrgId) as string | undefined;

  // Determinar roles (considerando estado de carga)
  const isAdmin = !loading && (profile?.role === 'admin' || profile?.role === 'super_admin');
  const isSuperAdmin = !loading && profile?.role === 'super_admin';
  const isCalendarPage = location.pathname === '/dashboard' || (!location.pathname.startsWith('/admin') && !location.pathname.startsWith('/super-admin') && !location.pathname.startsWith('/reservations') && !location.pathname.startsWith('/profile') && !location.pathname.startsWith('/maintenance') && !location.pathname.startsWith('/bonificaciones') && !location.pathname.startsWith('/login') && !location.pathname.startsWith('/register') && !location.pathname.startsWith('/forgot') && !location.pathname.startsWith('/verify') && location.pathname !== '/');
  const showFab = isCalendarPage;
  const { status: subscriptionStatus, latestEndDate, isPlanFree } = useSubscriptionStatus(orgId);

  // Modo soporte: super_admin con organization impersonada - debe definirse ANTES del useEffect
  const isInSupportMode = isSuperAdmin && impersonatedOrgId !== null;

  useEffect(() => {
    if (!orgId || !isAdmin) return;

    let cancelled = false;

    const showNewReservationNotice = async (reservation: { id?: string; resource_id?: string; user_id?: string; guest_name?: string | null; status?: string }) => {
      if (cancelled || !reservation.id || !['pending_validation', 'pending_payment', 'paid'].includes(reservation.status || '')) return;
      latestAdminReservationIdRef.current = reservation.id;
      if (location.pathname === '/admin/reservations') return;

      let clientName = reservation.guest_name || 'Cliente';
      let resourceName = 'Recurso';

      const [profileResult, resourceResult] = await Promise.all([
        reservation.user_id
          ? supabase.from('profiles').select('full_name').eq('id', reservation.user_id).maybeSingle()
          : Promise.resolve({ data: null }),
        reservation.resource_id
          ? supabase.from('resources').select('name').eq('id', reservation.resource_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (cancelled) return;

      clientName = profileResult.data?.full_name || clientName;
      resourceName = resourceResult.data?.name || resourceName;

      sessionStorage.setItem('gogi-new-admin-reservation-id', reservation.id);
      setNewReservationBanner({ id: reservation.id, clientName, resourceName });
      toast.info('Acabas de recibir una nueva reserva', {
        description: `${clientName} - ${resourceName}`,
        action: {
          label: 'Ver',
          onClick: () => navigate('/admin/reservations'),
        },
        duration: 8000,
      });
    };

    const fetchLatestReservation = async (notify: boolean) => {
      const { data } = await supabase
        .from('reservations')
        .select('id, resource_id, user_id, guest_name, status, created_at')
        .eq('organization_id', orgId)
        .in('status', ['pending_validation', 'pending_payment', 'paid'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || !data?.id) return;
      const previousId = latestAdminReservationIdRef.current;
      latestAdminReservationIdRef.current = data.id;
      if (notify && previousId && previousId !== data.id) {
        await showNewReservationNotice(data);
      }
    };

    fetchLatestReservation(false);
    const fallbackInterval = window.setInterval(() => fetchLatestReservation(true), 10000);

    const channel = supabase
      .channel(`admin-new-reservations-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations',
          filter: `organization_id=eq.${orgId}`,
        },
        async (payload) => {
          const reservation = payload.new as { id?: string; resource_id?: string; user_id?: string; guest_name?: string | null; status?: string };
          await showNewReservationNotice(reservation);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(fallbackInterval);
      supabase.removeChannel(channel);
    };
  }, [orgId, isAdmin, location.pathname, navigate]);

  useEffect(() => {
    if (!orgId || !isAdmin) {
      return;
    }

    let cancelled = false;
    const fetchPendingCount = async () => {
      const { count, error } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .in('status', ['pending_validation', 'pending_payment', 'paid']);

      if (!cancelled && !error) {
        setPendingAdminReservationsCount(count || 0);
      }
    };

    fetchPendingCount();
    const fallbackInterval = window.setInterval(fetchPendingCount, 10000);

    const channel = supabase
      .channel(`admin-pending-reservations-count-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(fallbackInterval);
      supabase.removeChannel(channel);
    };
  }, [orgId, isAdmin]);

  useEffect(() => {
    if (!profile?.organization_id) return;

    let cancelled = false;
    const loadOrganization = async () => {
      setOrgLoading(true);
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();
      if (!cancelled && data) {
        setOrganization(data);
      }
      if (!cancelled) {
        setOrgLoading(false);
      }
    };

    loadOrganization();
    return () => {
      cancelled = true;
    };
  }, [profile?.organization_id]);

  const handleSignOut = async () => {
    const slug = organization?.slug;
    const wasInSupportMode = isInSupportMode;

    if (wasInSupportMode) {
      setImpersonatedOrgId(null);
    }

    if (slug) {
      localStorage.setItem('lastOrganizationSlug', slug);
    }

    await signOut();

    // window.location.href para evitar que PrivateRoute redirija a / con Navigate
    if (wasInSupportMode) {
      window.location.href = '/super-admin/organizations';
    } else if (slug) {
      window.location.href = `/${slug}/login`;
    } else {
      window.location.href = '/';
    }
  };

  const effectiveBusinessType = organization?.business_type || businessType;
  const terminology = getTerminology(effectiveBusinessType);
  const isResidential = effectiveBusinessType === 'residential';
  let navItems: DashboardNavItem[] = [
    { name: 'Calendario', path: '/dashboard', icon: LayoutDashboard },
    { name: terminology.reservationLabel, path: '/reservations/new', icon: Calendar },
    { name: `Mis ${terminology.reservationLabel}s`, path: '/reservations/my', icon: History },
    { name: terminology.noticesLabel, path: '/maintenance', icon: Bell },
    { name: 'Mi Perfil', path: '/profile', icon: User },
  ];

  if (isGuest) {
    navItems = [
      { name: 'Calendario', path: `/${organization?.slug || ''}`, icon: LayoutDashboard },
      { name: `Nueva ${terminology.reservationLabel}`, path: '/reservations/new', icon: Calendar },
      { name: terminology.noticesLabel, path: '/maintenance', icon: Bell },
    ];
  }

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
      { name: `Calendario (${terminology.reservationLabel}s)`, path: '/dashboard', icon: Calendar },
      { name: `Gestión ${terminology.reservationLabel}s`, path: '/admin/reservations', icon: Calendar },
      { name: isResidential ? terminology.areaLabel + 's' : 'Profesional', path: '/admin/resources', icon: isResidential ? Building2 : Users },
      ...(!isResidential ? [{ name: 'Servicios', path: '/admin/services', icon: Package }] : []),
      ...(!isResidential ? [{ name: 'Rendimiento / Estadísticas', path: '/admin/statistics', icon: History }] : []),
      { name: terminology.userLabel + 's', path: '/admin/users', icon: User },
      { name: 'Suscripción', path: '/admin/subscription', icon: Crown },
      { name: 'Bonificaciones', path: '/admin/bonificaciones', icon: Gift },
      { name: 'Configuración', path: '/admin/settings', icon: Settings },
    ];

    // Si es super_admin y está en modo soporte, añadir gestión de organizaciones al principio
    if (isSuperAdmin && isInSupportMode) {
      adminItems.unshift({ name: 'Gestión Organizaciones', path: '/super-admin/organizations', icon: Building2 });
    }

    navItems = [...adminItems, { name: `Nueva ${terminology.reservationLabel}`, path: '/reservations/new', icon: Calendar }, { name: terminology.noticesLabel, path: '/maintenance', icon: Bell }, { name: 'Mi Perfil', path: '/profile', icon: User }];
  }

  if (isPlanFree && !isAdmin && !isSuperAdmin) {
    navItems = navItems.filter((item) => item.path !== '/maintenance');
  }

  // Plan gratuito: marcar módulos de pago para mostrar el icono de corona, pero no bloquear la navegación
  const lockedPaths = isPlanFree
    ? ['/maintenance', '/admin', '/admin/statistics']
    : [];
  navItems = navItems.map((item) => ({
    ...item,
    locked: lockedPaths.includes(item.path),
  }));

  // Función para salir del modo soporte
  const handleExitSupport = () => {
    setImpersonatedOrgId(null);
    navigate('/super-admin/organizations');
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${organization?.slug}/login`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Enlace copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}/${organization?.slug}/login`;
    const text = `¡Hola! Puedes realizar tus reservas en ${organization?.name} aquí: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const openNewReservationBanner = () => {
    setNewReservationBanner(null);
    navigate('/admin/reservations');
  };



  const bottomNavItems = navItems
    .filter(item => !item.path.includes('/reservations/new'))
    .slice(0, isGuest ? 2 : 3);

  const isMoreActive = !isGuest && bottomNavItems.length > 0 && !bottomNavItems.some(item => location.pathname === item.path);

  return (
    <PwaInstallProvider>
    <div className="min-h-screen bg-gray-50 flex relative overflow-hidden">
      {/* Global Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[15%] w-[300px] h-[300px] bg-[#FF3B30] rounded-full blur-[80px] animate-blob opacity-0" style={{ animationDuration: '8s', animationDelay: '0s' }}></div>
        <div className="absolute top-[40%] right-[10%] w-[250px] h-[250px] bg-[#FF3B30] rounded-full blur-[80px] animate-blob opacity-0" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
        <div className="absolute bottom-[20%] left-[25%] w-[350px] h-[350px] bg-[#FF3B30] rounded-full blur-[100px] animate-blob opacity-0" style={{ animationDuration: '12s', animationDelay: '4s' }}></div>
        <div className="absolute bottom-[5%] right-[25%] w-[200px] h-[200px] bg-[#FF3B30] rounded-full blur-[60px] animate-blob opacity-0" style={{ animationDuration: '9s', animationDelay: '1s' }}></div>
        <div className="absolute top-[5%] right-[40%] w-[280px] h-[280px] bg-[#FF3B30] rounded-full blur-[80px] animate-blob opacity-0" style={{ animationDuration: '11s', animationDelay: '5s' }}></div>
      </div>

      {/* Sidebar / Bottom Sheet */}
      <aside
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 bg-white/80 backdrop-blur-2xl rounded-t-[2rem] shadow-apple transition-transform duration-500 ease-apple lg:static lg:inset-y-0 lg:w-64 lg:rounded-none lg:shadow-none lg:border-r lg:border-gray-100 flex flex-col h-[85vh] lg:h-full lg:translate-y-0 overflow-hidden lg:bg-white lg:backdrop-blur-none lg:z-auto",
          isSidebarOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 lg:p-6 flex items-center justify-between border-b border-gray-100">
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
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="lg:hidden rounded-full bg-gray-100 hover:bg-gray-200">
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

          <nav className="flex-1 overflow-y-auto px-4 space-y-1 mt-4 lg:mt-0 pb-safe">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group",
                    isActive
                      ? "bg-gray-100 text-[#FF3B30]"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Indicador Izquierdo */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#FF3B30] rounded-r-full shadow-[2px_0_10px_rgba(255,59,48,0.3)]" />
                    )}
                    <item.icon className={cn("w-5 h-5 ml-1 transition-transform duration-200 group-hover:scale-110", isActive ? "text-[#FF3B30]" : "text-gray-400 group-hover:text-gray-600")} />
                    <span className="truncate flex-1">{item.name}</span>
                    {item.path === '/admin/reservations' && pendingAdminReservationsCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white shadow-sm shadow-red-500/30">
                        {pendingAdminReservationsCount > 99 ? '99+' : pendingAdminReservationsCount}
                      </span>
                    )}
                    {item.locked && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  </>
                )}
              </NavLink>
            ))}

            {/* Compartir enlace - Solo para Administradores */}
            {isAdmin && organization?.slug && (
              <div className="mx-0 mt-6 mb-2 p-4 bg-primary/5 rounded-2xl border border-primary/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="p-1 bg-primary/10 rounded-lg text-primary">
                    <Share2 className="w-3.5 h-3.5" />
                  </div>
                  Compartir negocio
                </div>
                <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
                  Comparte este enlace con tus clientes para que puedan reservar.
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleCopyLink}
                    className="flex-1 h-9 text-[10px] bg-white border-gray-200 hover:bg-gray-50 hover:text-primary transition-all duration-200 shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 mr-1.5 text-green-500" />
                        ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1.5" />
                        Copiar
                      </>
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleShareWhatsApp}
                    className="flex-1 h-9 text-[10px] bg-white border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all duration-200 shadow-sm"
                  >
                    <MessageCircle className="w-3 h-3 mr-1.5 text-green-500" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            )}

            {/* Usuario y Cerrar Sesión - visible para todos los usuarios */}
            {(profile || isGuest) && !loading && (
              <>
                <div className="pt-4 pb-2 border-t border-gray-200">
                  <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-md">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">{profile?.full_name?.charAt(0) || 'I'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name || 'Invitado'}</p>
                      <p className="text-xs text-gray-500 capitalize">{profile?.role || 'Guest'}</p>
                    </div>
                  </div>
                </div>
                <PwaInstallButton />

                {isGuest ? (
                  <button
                    onClick={() => openAuthModal('login')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Iniciar Sesión
                  </button>
                ) : (
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                )}

                <button
                  onClick={() => {
                    localStorage.removeItem('lastOrganizationSlug');
                    localStorage.removeItem('guestSession');
                    window.location.href = '/';
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  GoGi Reservas &copy; {new Date().getFullYear()}
                </button>
              </>
            )}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0 relative z-10">
        <header className="lg:hidden sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-black/5 flex items-center justify-between p-4 transition-all duration-500" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-2 overflow-hidden">
            {organization?.logo_url ? (
              <img src={organization.logo_url} alt="Logo" className="w-6 h-6 object-contain" />
            ) : (
              <Building2 className="w-6 h-6 text-primary" />
            )}
            <span className="font-bold text-gray-900 truncate">{organization?.name || 'GoGi Reservas'}</span>
          </div>
          <button onClick={() => isGuest ? openAuthModal('login') : navigate('/profile')} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
             {isGuest ? (
               <User className="w-4 h-4 text-primary" />
             ) : (
               <span className="text-xs font-semibold text-primary">{profile?.full_name?.charAt(0) || 'U'}</span>
             )}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {newReservationBanner && isAdmin && location.pathname !== '/admin/reservations' && (
              <div className="mb-6 rounded-[1.75rem] border border-primary/10 bg-white/90 p-4 shadow-[0_18px_60px_-28px_rgba(30,41,59,0.55)] ring-1 ring-white/70 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 animate-notification-pop">
                      <span className="absolute inset-0 rounded-2xl bg-primary/25 animate-notification-ping" />
                      <Bell className="relative h-5 w-5 animate-attention-bell" />
                      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#FF3B30] ring-2 ring-white" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-950">Acabas de recibir una nueva reserva</p>
                      <p className="mt-0.5 text-xs font-medium text-gray-500">
                        {newReservationBanner.clientName} reservó {newReservationBanner.resourceName}. Revísala en Gestión de reservas.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setNewReservationBanner(null)} className="h-9 rounded-xl border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-950">
                      Luego
                    </Button>
                    <Button size="sm" onClick={openNewReservationBanner} className="h-9 rounded-xl bg-primary text-xs font-bold text-white shadow-sm hover:bg-primary/90">
                      Ver reserva
                    </Button>
                  </div>
                </div>
              </div>
            )}
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



      {/* Bottom Navigation for Mobile */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-200 flex justify-around items-center h-[72px] px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {bottomNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-[#FF3B30]" : "text-gray-500 hover:text-gray-900"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-6 h-6", isActive ? "text-[#FF3B30]" : "text-gray-500")} strokeWidth={1.5} />
                  {item.path === '/admin/reservations' && pendingAdminReservationsCount > 0 && (
                    <span className="absolute top-2 right-1/2 flex h-4 min-w-4 translate-x-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-sm shadow-red-500/30">
                      {pendingAdminReservationsCount > 99 ? '99+' : pendingAdminReservationsCount}
                    </span>
                  )}
                  <span className="text-[10px] font-medium leading-none whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px] text-center">
                    {item.name.split(' ')[0]}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        {!isAdmin && !isSuperAdmin && (
          <NavLink
            to="/reservations/new"
            end
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-[#FF3B30]" : "text-gray-500 hover:text-gray-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Plus className={cn("w-6 h-6", isActive ? "text-[#FF3B30]" : "text-gray-500")} strokeWidth={1.5} />
                <span className="text-[10px] font-medium leading-none whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px] text-center">Nueva</span>
              </>
            )}
          </NavLink>
        )}
        {!isGuest && navItems.length > 4 && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
              isMoreActive ? "text-[#FF3B30]" : "text-gray-500 hover:text-gray-900"
            )}
          >
            <Menu className={cn("w-6 h-6", isMoreActive ? "text-[#FF3B30]" : "text-gray-500")} strokeWidth={1.5} />
            <span className="text-[10px] font-medium leading-none">Más</span>
          </button>
        )}
        {isGuest && (
          <button
            onClick={() => openAuthModal('login')}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 hover:text-[#FF3B30] transition-colors"
          >
            <User className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-[10px] font-medium leading-none">Iniciar sesión</span>
          </button>
        )}
      </nav>

      {/* Floating Action Button for New Reservation on Mobile - Only on Calendar view */}
      {showFab && (
        <button
          onClick={() => navigate('/reservations/new')}
          className="md:hidden fixed !z-[9999] w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg shadow-gray-900/30 flex items-center justify-center active:scale-95 transition-transform duration-200"
          style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))', right: '16px' }}
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </button>
      )}

      {/* Overlay for mobile Bottom Sheet */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/10 z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <AuthModal />

    </div>
    </PwaInstallProvider>
  );
}
