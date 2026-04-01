import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Loader2,
  XCircle,
  ShieldPlus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  PieChart,
  BarChart3,
  Map as MapIcon,
  Download,
} from 'lucide-react';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { differenceInDays, parseISO, isPast } from 'date-fns';
import { AlertDialog } from '@/components/ui/alert-dialog';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SuperAdminOrganizations() {
  const { profile, setImpersonatedOrgId } = useAuth();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending_validation: 0,
    cancelled: 0,
    pastDue: 0,
    inactive: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalReservations: 0,
    completedPayments: 0,
    averageReservationValue: 0,
    activeSubscriptions: 0,
    subscriptionRevenue: 0,
    mrr: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'list' | 'reports'>('list');
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    contact_email: '',
    phone: '',
    address: '',
    logo_url: '',
    login_photo_url: '',
    smtp_email: '',
    smtp_password: ''
  });
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [selectedOrgForSubscription, setSelectedOrgForSubscription] = useState<any>(null);
  const [subscriptionFormData, setSubscriptionFormData] = useState({
    plan_id: '',
    auto_renew: false
  });
  const [plans, setPlans] = useState<any[]>([]);
  const [alertConfig, setAlertConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const showAlert = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    setAlertConfig({
      open: true,
      title,
      description,
      onConfirm: () => {},
      variant,
      showCancel: false,
      confirmText: 'Entendido'
    });
  };

  const showConfirm = (title: string, description: string, onConfirm: () => void, variant: 'default' | 'destructive' = 'default') => {
    setAlertConfig({
      open: true,
      title,
      description,
      onConfirm,
      variant,
      showCancel: true,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar'
    });
  };

  type Subscription = {
  updated_at: string;
  // agrega más campos si quieres
};

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      fetchData();
      // Run subscription status update for all organizations on load
      updateAllOrganizationStatuses();
    }
  }, [profile]);

  const updateAllOrganizationStatuses = async () => {
    try {
      // Get all organizations
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id');

      if (orgs && orgs.length > 0) {
        // Update each organization's subscription status
        for (const org of orgs) {
          await updateOrganizationSubscriptionStatus(org.id);
        }
      }
    } catch (error) {
      console.error('Error updating organization statuses:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch organizations con suscripciones (solo datos necesarios)
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          *,
          subscriptions (
            id,
            plan_id,
            status,
            end_date,
            updated_at,
            subscription_plans (name, price)
          )
        `)
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Asegurar que cada org tenga su array de subscriptions ordenado por updated_at
      if (orgs) {
        orgs.forEach((org: any) => {
          if (org.subscriptions && Array.isArray(org.subscriptions)) {
            org.subscriptions = org.subscriptions.sort((a: any, b: any) => {
              const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
              const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
              return dateB - dateA;
            });
          }
        });
      }

      // Calcular stats básicos de organizaciones
      const active = orgs?.filter(o => o.subscription_status === 'active').length || 0;
      const pending_validation = orgs?.filter(o => o.subscription_status === 'pending_validation').length || 0;
      const cancelled = orgs?.filter(o => o.subscription_status === 'cancelled').length || 0;
      const pastDue = orgs?.filter(o => o.subscription_status === 'past_due' || o.subscription_status === 'expired').length || 0;
      const inactive = orgs?.filter(o => o.subscription_status === 'inactive' || !o.subscription_status).length || 0;

      // Obtener conteo de usuarios de forma eficiente
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Obtener stats de reservas del mes actual (mucho más eficiente)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      // Reservas del mes
      const { data: monthReservations } = await supabase
        .from('reservations')
        .select('total_cost')
        .gte('created_at', startOfMonth)
        .lt('created_at', endOfMonth);

      const monthReservationsCount = monthReservations?.length || 0;
      const monthReservationsValue = monthReservations?.reduce((sum, r) => sum + Number(r.total_cost || 0), 0) || 0;

      // Todas las reservas para valor promedio
      const { count: totalReservationsCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true });

      // Pagos completados del mes
      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', startOfMonth)
        .lt('created_at', endOfMonth);

      const monthRevenue = monthPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

      // Suscripciones activas (con conteo eficiente)
      const { count: activeSubscriptionsCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Obtener revenue de suscripciones activas del mes
      const { data: activeSubs } = await supabase
        .from('subscriptions')
        .select('id, status')
        .eq('status', 'active')
        .gte('start_date', startOfMonth);

      const subscriptionRevenue = activeSubs?.length ? activeSubs.length * 50000 : 0; // Estimación simplificada

      setOrganizations(orgs || []);

      setStats({
        total: orgs?.length || 0,
        active,
        pending_validation,
        cancelled,
        pastDue,
        inactive,
        totalRevenue: monthRevenue + subscriptionRevenue,
        totalUsers: usersCount || 0,
        totalReservations: totalReservationsCount || 0,
        completedPayments: monthPayments?.length || 0,
        averageReservationValue: monthReservationsCount > 0 ? monthReservationsValue / monthReservationsCount : 0,
        activeSubscriptions: activeSubscriptionsCount || 0,
        subscriptionRevenue,
        mrr: (activeSubscriptionsCount || 0) * 50000
      });
    } catch (error) {
      console.error('Error fetching super-admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (org: any = null) => {
    if (org) {
      setEditingOrg(org);
      setFormData({
        name: org.name || '',
        slug: org.slug || '',
        contact_email: org.contact_email || '',
        phone: org.phone || '',
        address: org.address || '',
        logo_url: org.logo_url || '',
        login_photo_url: org.login_photo_url || '',
        smtp_email: org.smtp_email || '',
        smtp_password: org.smtp_password || ''
      });
    } else {
      setEditingOrg(null);
      setFormData({
        name: '',
        slug: '',
        contact_email: '',
        phone: '',
        address: '',
        logo_url: '',
        login_photo_url: '',
        smtp_email: '',
        smtp_password: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataToSave = {
      ...formData
    };

    if (editingOrg) {
      const { error } = await supabase
        .from('organizations')
        .update(dataToSave)
        .eq('id', editingOrg.id);
      if (!error) {
        setIsModalOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('organizations')
        .insert([dataToSave]);
      if (!error) {
        setIsModalOpen(false);
        fetchData();
      }
    }
    setLoading(false);
  };

  const deleteOrg = async (id: string) => {
    showConfirm(
      '¿Estás seguro de eliminar esta organización?',
      'Esto afectará a todos sus usuarios y datos. Esta acción no se puede deshacer.',
      async () => {
        const { error } = await supabase
          .from('organizations')
          .delete()
          .eq('id', id);
        if (!error) fetchData();
      },
      'destructive'
    );
  };

  const handleSupport = (orgId: string) => {
    setImpersonatedOrgId(orgId);
    navigate('/admin');
  };

  const handleOpenLogin = (org: any) => {
    window.open(`/${org.slug}/login`, '_blank');
    setOpenDropdownId(null);
  };

  const handleCopyLink = async (org: any) => {
    const url = `${window.location.origin}/${org.slug}/login`;
    await navigator.clipboard.writeText(url);
    setOpenDropdownId(null);
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Si el click no es en un botón de dropdown o dentro de un dropdown abierto, cerrar todo
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-trigger') && !target.closest('.dropdown-menu')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenSubscriptionModal = async (org: any) => {
    setSelectedOrgForSubscription(org);

    // Fetch available plans if not already loaded
    if (plans.length === 0) {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setPlans(data || []);
    }

    const subscription = org.subscriptions?.[0];
    setSubscriptionFormData({
      plan_id: subscription?.plan_id || '',
      auto_renew: subscription?.auto_renew || false
    });
    setSubscriptionModalOpen(true);
  };


  const updateOrganizationSubscriptionStatus = async (organizationId: string) => {
    // Get current organization data
    const { data: org } = await supabase
      .from('organizations')
      .select('id, subscription_status')
      .eq('id', organizationId)
      .single();

    // Get all subscriptions for this organization, ordered by updated_at descending
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('id, status, end_date, updated_at, subscription_plans(name)')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });

    // Get the most recent subscription (by updated_at)
    const mostRecentSubscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;

    // Determine the status based on the most recent subscription
    let newStatus = 'inactive';
    let newEndDate = null;

    if (mostRecentSubscription) {
      // Map subscription status to organization status
      switch (mostRecentSubscription.status) {
        case 'active':
          // Check if expired
          const endDate = new Date(mostRecentSubscription.end_date);
          const now = new Date();
          const isExpired = endDate < now;
          
          if (isExpired) {
            newStatus = 'past_due';
          } else {
            // Check for pending payments
            const { data: pendingPayments } = await supabase
              .from('subscription_payments')
              .select('id')
              .eq('subscription_id', mostRecentSubscription.id)
              .eq('status', 'pending');
            
            if (pendingPayments && pendingPayments.length > 0) {
              newStatus = 'pending_validation';
            } else {
              // Check if expiring soon
              const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (daysUntilExpiry <= 7) {
                newStatus = 'pending_validation';
              } else {
                newStatus = 'active';
              }
            }
          }
          break;
        case 'pending':
          newStatus = 'pending_validation';
          break;
        case 'cancelled':
          newStatus = 'cancelled';
          break;
        case 'expired':
          newStatus = 'past_due';
          break;
        default:
          newStatus = 'inactive';
      }
      
      newEndDate = mostRecentSubscription.end_date;
    }

    // Only update if the status is different
    if (org && org.subscription_status !== newStatus) {
      const { error } = await supabase
        .from('organizations')
        .update({
          subscription_status: newStatus,
          subscription_end_date: newEndDate
        })
        .eq('id', organizationId);

      if (error) {
        console.error('Error updating organization subscription status:', error);
      }
    }
  };

  const handleRenewSubscription = async (subscription: any) => {
    showConfirm(
      '¿Deseas renovar esta suscripción?',
      'Se extenderá la fecha de vencimiento según la duración del plan.',
      async () => {
        try {
          const plan = subscription.subscription_plans;
          const currentEndDate = new Date(subscription.end_date);
          const newEndDate = new Date(currentEndDate.getTime() + plan.duration_in_days * 24 * 60 * 60 * 1000);

          const { error } = await supabase
            .from('subscriptions')
            .update({
              end_date: newEndDate.toISOString(),
              status: 'active'
            })
            .eq('id', subscription.id);

          if (error) throw error;

          // Create renewal payment record
          if (plan.price > 0) {
            const { error: paymentError } = await supabase
              .from('subscription_payments')
              .insert({
                subscription_id: subscription.id,
                amount: plan.price,
                payment_method: 'subscription_renewal',
                status: 'pending',
                paid_at: null
              });

            if (paymentError) {
              console.error('Error creating renewal payment:', paymentError);
            }
          }

          // Update organization's subscription status
          await updateOrganizationSubscriptionStatus(selectedOrgForSubscription.id);

          setSubscriptionModalOpen(false);
          fetchData();
        } catch (error: any) {
          console.error('Error renewing subscription:', error);
          showAlert('Error al renovar', error.message, 'destructive');
        }
      }
    );
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    showConfirm(
      '¿Estás seguro de cancelar esta suscripción?',
      'La organización perderá acceso a las funcionalidades premium.',
      async () => {
        try {
          // Update subscription status to cancelled
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('id', subscriptionId);

          if (error) throw error;

          // Cancel any pending payments for this subscription
          const { error: paymentError } = await supabase
            .from('subscription_payments')
            .update({ status: 'cancelled' })
            .eq('subscription_id', subscriptionId)
            .eq('status', 'pending');

          if (paymentError) {
            console.error('Error cancelling payments:', paymentError);
            // Don't fail the cancellation if payment update fails
          }

          // Update organization's subscription status
          await updateOrganizationSubscriptionStatus(selectedOrgForSubscription.id);

          setSubscriptionModalOpen(false);
          fetchData();
        } catch (error: any) {
          console.error('Error cancelling subscription:', error);
          showAlert('Error al cancelar', error.message, 'destructive');
        }
      },
      'destructive'
    );
  };

  const handleSubscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedPlan = plans.find(p => p.id === subscriptionFormData.plan_id);
      if (!selectedPlan) {
        showAlert('Plan no válido', 'Por favor selecciona un plan válido', 'destructive');
        return;
      }

      // Always create a new subscription (never update existing)
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + selectedPlan.duration_in_days * 24 * 60 * 60 * 1000).toISOString();

      // Set subscription status based on whether payment is required
      const subscriptionStatus = selectedPlan.price > 0 ? 'pending' : 'active';

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert({
          organization_id: selectedOrgForSubscription.id,
          plan_id: subscriptionFormData.plan_id,
          start_date: startDate,
          end_date: endDate,
          status: subscriptionStatus,
          auto_renew: subscriptionFormData.auto_renew
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial payment record if payment is required
      if (subscription && selectedPlan.price > 0) {
        const { error: paymentError } = await supabase
          .from('subscription_payments')
          .insert({
            subscription_id: subscription.id,
            amount: selectedPlan.price,
            payment_method: 'subscription_assignment',
            status: 'pending', // Pending until authorized
            paid_at: null
          });

        if (paymentError) {
          console.error('Error creating subscription payment:', paymentError);
          // Don't fail the subscription creation
        }
      }

      // Update organization's subscription status
      await updateOrganizationSubscriptionStatus(selectedOrgForSubscription.id);

      setSubscriptionModalOpen(false);
      // Refresh data to show updated status
      await fetchData();
    } catch (error: any) {
      console.error('Error saving subscription:', error);
      showAlert('Error al guardar', error.message, 'destructive');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || org.subscription_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Report Data
  const subscriptionData = [
    { name: 'Activas', value: stats.active },
    { name: 'Pendiente Validación', value: stats.pending_validation },
    { name: 'Canceladas', value: stats.cancelled },
    { name: 'Vencidas', value: stats.pastDue },
    { name: 'Sin subscripción', value: stats.inactive }
  ].filter(d => d.value > 0);

  if (profile?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <XCircle className="w-12 h-12 mb-4 text-red-400" />
        <p className="text-lg font-medium">Acceso no autorizado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <ShieldPlus className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Panel de Control Global</h1>
            <p className="text-gray-500 text-sm">Visión general y gestión de toda la plataforma.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
            <Button 
              variant={view === 'list' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('list')}
              className={cn("rounded-lg h-8 text-xs font-bold", view === 'list' && "bg-white shadow-sm")}
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              Organizaciones
            </Button>
            <Button 
              variant={view === 'reports' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('reports')}
              className={cn("rounded-lg h-8 text-xs font-bold", view === 'reports' && "bg-white shadow-sm")}
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              Informes
            </Button>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 h-9 rounded-xl text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Nueva Org
          </Button>
        </div>
      </div>

      {/* Stats Grid - Solo lo esencial */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Orgs</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-sm bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Activas</p>
              <p className="text-xl font-bold text-green-600">{stats.active}</p>
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-sm bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Ingresos</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {view === 'list' ? (
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="p-4 bg-gray-50/50 border-b border-gray-100">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, slug o dirección..."
                  className="pl-10 h-10 rounded-xl text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-600 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activa</option>
                  <option value="pending_validation">Pendiente Validación</option>
                  <option value="cancelled">Cancelada</option>
                  <option value="past_due">Vencida</option>
                  <option value="inactive">Sin subscripción</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-visible">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50/30 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Organización</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ubicación / Contacto</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suscripción</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={4} className="px-6 py-6">
                          <div className="h-4 bg-gray-100 rounded-full w-full" />
                        </td>
                      </tr>
                    ))
                  ) : filteredOrgs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                        No se encontraron organizaciones con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredOrgs.map((org, index) => {
                      // Find the most relevant subscription for display (most recent by updated_at)
                      const subscription = org.subscriptions?.sort((a: Subscription, b: Subscription) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0] || null;

                      const daysUntilRenewal = subscription?.end_date
                        ? differenceInDays(parseISO(subscription.end_date), new Date())
                        : null;
                      const isExpired = subscription?.end_date ? isPast(parseISO(subscription.end_date)) : false;
                      const isWarning = daysUntilRenewal !== null && daysUntilRenewal <= 7 && daysUntilRenewal > 0;

                      return (
                      <tr key={org.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {org.logo_url ? (
                              <img src={org.logo_url} className="w-10 h-10 rounded-xl object-contain bg-white border border-gray-100 p-1.5 shadow-sm" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-50">
                                <Building2 className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-gray-900">{org.name}</div>
                              <div className="text-[10px] text-indigo-600 font-mono tracking-tighter">/{org.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center text-gray-700 font-medium">
                              <MapPin className="w-3 h-3 mr-1.5 text-gray-400" />
                              {org.address || 'Sin dirección'}
                            </div>
                            <div className="text-[10px] text-gray-400 flex items-center">
                              <span className="font-bold text-gray-500 mr-2">{org.contact_email}</span>
                              {org.phone && <span>• {org.phone}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            {subscription ? (
                              <>
                                <div className="text-sm font-medium text-gray-900">
                                  {subscription.subscription_plans?.name || 'Plan desconocido'}
                                </div>
                                <div className={cn(
                                  "inline-flex items-center w-fit rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase",
                                  subscription.status === 'active' && !isExpired
                                    ? "bg-green-50 text-green-700 border-green-100"
                                    : subscription.status === 'active' && isExpired
                                    ? "bg-red-50 text-red-700 border-red-100"
                                    : subscription.status === 'pending'
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-100"
                                    : "bg-gray-50 text-gray-500 border-gray-100"
                                )}>
                                  {subscription.status === 'active' && !isExpired && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                  {(subscription.status === 'active' && isExpired) && <AlertCircle className="w-3 h-3 mr-1" />}
                                  {subscription.status}
                                </div>
                                <div className={cn(
                                  "flex items-center text-[10px] font-medium",
                                  isExpired ? "text-red-600" : isWarning ? "text-amber-600" : "text-gray-500"
                                )}>
                                  {isExpired ? (
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                  ) : isWarning ? (
                                    <Clock className="w-3 h-3 mr-1" />
                                  ) : (
                                    <Calendar className="w-3 h-3 mr-1" />
                                  )}
                                  {formatDate(subscription.end_date)}
                                  {isWarning && !isExpired && ` (En ${daysUntilRenewal}d)`}
                                  {isExpired && " (Vencido)"}
                                </div>
                              </>
                            ) : (
                              <div className="text-[10px] text-gray-400 italic">Sin suscripción</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5 overflow-visible">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              onClick={() => handleSupport(org.id)}
                              title="Entrar en modo soporte"
                            >
                              <ShieldPlus className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg"
                              onClick={() => handleOpenSubscriptionModal(org)}
                              title="Gestionar Suscripción"
                            >
                              <Calendar className="w-4 h-4" />
                            </Button>
                            
                            <div className="relative">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 relative dropdown-trigger rounded-lg",
                                  openDropdownId === org.id && "bg-gray-100 text-indigo-600"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(openDropdownId === org.id ? null : org.id);
                                }}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              {openDropdownId === org.id && (
                                <div 
                                  className={cn(
                                    "absolute right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 min-w-[160px] dropdown-menu animate-in fade-in zoom-in-95 duration-200",
                                    index >= filteredOrgs.length - 2 ? "bottom-full mb-1" : "top-full mt-1"
                                  )}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => handleOpenLogin(org)}
                                    className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                                    Abrir Login
                                  </button>
                                  <button
                                    onClick={() => handleCopyLink(org)}
                                    className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                                  >
                                    <Download className="w-3.5 h-3.5 text-gray-400 rotate-[-90deg]" />
                                    Copiar Link
                                  </button>
                                </div>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg"
                              onClick={() => handleOpenModal(org)}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              onClick={() => deleteOrg(org.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden flex flex-col divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 animate-pulse">
                    <div className="h-24 bg-gray-100 rounded-xl w-full" />
                  </div>
                ))
              ) : filteredOrgs.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400 text-sm">
                  No se encontraron organizaciones con los filtros aplicados.
                </div>
              ) : (
                filteredOrgs.map((org, index) => {
                  const subscription = org.subscriptions?.sort((a: Subscription, b: Subscription) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0] || null;
                  const daysUntilRenewal = subscription?.end_date ? differenceInDays(parseISO(subscription.end_date), new Date()) : null;
                  const isExpired = subscription?.end_date ? isPast(parseISO(subscription.end_date)) : false;
                  const isWarning = daysUntilRenewal !== null && daysUntilRenewal <= 7 && daysUntilRenewal > 0;

                  return (
                    <div key={org.id} className="p-4 bg-white hover:bg-gray-50 flex flex-col gap-4">
                      {/* Name & Actions */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          {org.logo_url ? (
                            <img src={org.logo_url} className="w-10 h-10 rounded-xl object-contain bg-white border border-gray-100 p-1.5 shadow-sm shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-50 shrink-0">
                              <Building2 className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex flex-col">
                            <span className="font-bold text-gray-900 truncate">{org.name}</span>
                            <span className="text-[10px] text-indigo-600 font-mono tracking-tighter truncate">/{org.slug}</span>
                          </div>
                        </div>

                        {/* Top-right Actions Menu */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-indigo-400 hover:text-indigo-600 bg-indigo-50/50 rounded-lg shrink-0"
                            onClick={() => handleSupport(org.id)}
                            title="Entrar en modo soporte"
                          >
                            <ShieldPlus className="w-4 h-4" />
                          </Button>
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dropdown-trigger rounded-lg shrink-0",
                                openDropdownId === org.id && "bg-gray-100 text-indigo-600"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === org.id ? null : org.id);
                              }}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            {openDropdownId === org.id && (
                              <div 
                                className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 min-w-[160px] dropdown-menu animate-in fade-in duration-200"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => handleOpenLogin(org)}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                                  Abrir Login
                                </button>
                                <button
                                  onClick={() => handleCopyLink(org)}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                                >
                                  <Download className="w-3.5 h-3.5 text-gray-400 rotate-[-90deg]" />
                                  Copiar Link
                                </button>
                                <button
                                  onClick={() => { handleOpenModal(org); setOpenDropdownId(null); }}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2.5"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Editar Org
                                </button>
                                <button
                                  onClick={() => { deleteOrg(org.id); setOpenDropdownId(null); }}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-red-700 hover:bg-red-50 flex items-center gap-2.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contact & Address */}
                      <div className="space-y-1.5 pb-3 border-b border-gray-50">
                        <div className="flex items-start text-gray-700 font-medium text-xs">
                          <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{org.address || 'Sin dirección'}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-medium flex flex-wrap gap-x-3 gap-y-1 ml-5">
                          <span>{org.contact_email}</span>
                          {org.phone && <span>{org.phone}</span>}
                        </div>
                      </div>

                      {/* Subscription Status Line */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1.5">
                          {subscription ? (
                            <>
                              <div className={cn(
                                "inline-flex items-center w-fit rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase shrink-0",
                                subscription.status === 'active' && !isExpired
                                  ? "bg-green-50 text-green-700 border-green-100"
                                  : subscription.status === 'active' && isExpired
                                  ? "bg-red-50 text-red-700 border-red-100"
                                  : subscription.status === 'pending'
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-100"
                                  : "bg-gray-50 text-gray-500 border-gray-100"
                              )}>
                                {subscription.status === 'active' && !isExpired && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                {(subscription.status === 'active' && isExpired) && <AlertCircle className="w-3 h-3 mr-1" />}
                                {subscription.status}
                              </div>
                              <div className={cn(
                                "flex items-center text-[10px] font-medium",
                                isExpired ? "text-red-600" : isWarning ? "text-amber-600" : "text-gray-400"
                              )}>
                                {isExpired ? (
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                ) : isWarning ? (
                                  <Clock className="w-3 h-3 mr-1" />
                                ) : (
                                  <Calendar className="w-3 h-3 mr-1" />
                                )}
                                Hasta {formatDate(subscription.end_date)}
                              </div>
                            </>
                          ) : (
                            <div className="text-[10px] text-gray-400 italic">Sin suscripción</div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg text-xs"
                          onClick={() => handleOpenSubscriptionModal(org)}
                        >
                          <Calendar className="w-4 h-4 mr-1.5" />
                          Planes
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Reports View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none shadow-sm bg-white p-6">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-500" />
                Distribución de Suscripciones
              </CardTitle>
            </CardHeader>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={subscriptionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {subscriptionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-white p-6">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-indigo-500" />
                Ubicaciones por Organización
              </CardTitle>
            </CardHeader>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {organizations.filter(o => o.address).map((org, i) => (
                <div key={org.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-indigo-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-bold text-indigo-600 shadow-sm border border-gray-100">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{org.name}</div>
                      <div className="text-[10px] text-gray-500 flex items-center">
                        <MapPin className="w-2.5 h-2.5 mr-1" />
                        {org.address}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                    org.subscription_status === 'active' ? "bg-green-50 text-green-700 border-green-100" : 
                    org.subscription_status === 'pending_validation' ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
                    org.subscription_status === 'past_due' || org.subscription_status === 'expired' ? "bg-red-50 text-red-700 border-red-100" :
                    "bg-gray-50 text-gray-500 border-gray-100"
                  )}>
                    {org.subscription_status || 'sin suscripción'}
                  </div>
                </div>
              ))}
              {organizations.filter(o => o.address).length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No hay direcciones registradas para las organizaciones.
                </div>
              )}
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-white p-6 md:col-span-2">
            <CardHeader className="p-0 pb-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Crecimiento de Plataforma (Mes Actual)
              </CardTitle>
              <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                Proyección: +15% vs Mes Anterior
              </div>
            </CardHeader>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Total Orgs', value: stats.total },
                  { name: 'Activas', value: stats.active },
                  { name: 'Pendiente Validación', value: stats.pending_validation },
                  { name: 'Canceladas', value: stats.cancelled },
                  { name: 'Vencidas', value: stats.pastDue },
                  { name: 'Sin subscripción', value: stats.inactive }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    { [0,1,2,3].map((index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingOrg ? 'Editar Organización' : 'Nueva Organización'}</h2>
                <p className="text-gray-500 text-xs">Completa los datos para configurar el conjunto residencial.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <XCircle className="w-5 h-5 text-gray-400" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Nombre del Conjunto</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Residencial Los Olivos"
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">URL / Slug</Label>
                  <Input
                    value={formData.slug}
                    onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="los-olivos"
                    required
                    className="h-11 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Dirección Física</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Calle 123 # 45 - 67, Ciudad"
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Email de Contacto</Label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="admin@olivos.com"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Teléfono</Label>
                  <Input
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="300..."
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-amber-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">Configuración de Correo (SMTP)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Email SMTP (Emisor)</Label>
                    <Input
                      type="email"
                      value={formData.smtp_email}
                      onChange={e => setFormData({ ...formData, smtp_email: e.target.value })}
                      placeholder="notificaciones@dominio.com"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Contraseña SMTP / App Password</Label>
                    <Input
                      type="password"
                      value={formData.smtp_password}
                      onChange={e => setFormData({ ...formData, smtp_password: e.target.value })}
                      placeholder="••••••••••••"
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-gray-500 italic">
                  * Estos datos se usarán para enviar correos de confirmación y recordatorios desde esta organización específica.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px] rounded-xl font-bold shadow-lg shadow-indigo-500/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingOrg ? 'Guardar Cambios' : 'Crear Conjunto')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Management Modal */}
      {subscriptionModalOpen && selectedOrgForSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Gestión de Suscripción</h2>
                <p className="text-gray-500 text-xs">{selectedOrgForSubscription.name}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSubscriptionModalOpen(false)}>
                <XCircle className="w-5 h-5 text-gray-400" />
              </Button>
            </div>

            <form onSubmit={handleSubscriptionSubmit} className="p-8 space-y-6">
              {/* Current Subscription - Only show if not cancelled */}
              {selectedOrgForSubscription.subscription_status !== 'cancelled' && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm font-bold text-gray-700 mb-2">Suscripción Actual</div>
                  {(() => {
                    // Get ALL subscriptions sorted by updated_at (most recent first)
                    const allSubscriptions = selectedOrgForSubscription.subscriptions?.sort((a: Subscription, b: Subscription) =>
                      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                    ) || [];
                    
                    // Get the most recent subscription (by updated_at)
                    const displaySubscription = allSubscriptions[0] || null;

                    return displaySubscription ? (
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">
                          {displaySubscription.subscription_plans?.name || 'Plan desconocido'}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            Vence: {formatDate(displaySubscription.end_date)}
                          </span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                            displaySubscription.status === 'active' ? "bg-green-50 text-green-700" :
                            displaySubscription.status === 'pending' ? "bg-yellow-50 text-yellow-700" :
                            displaySubscription.status === 'cancelled' ? "bg-red-50 text-red-700" :
                            "bg-red-50 text-red-700"
                          )}>
                            {displaySubscription.status}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {(() => {
                            const endDate = new Date(displaySubscription.end_date);
                            const now = new Date();
                            const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            const isExpired = daysUntilExpiry < 0;
                            const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry >= 0;

                            return displaySubscription.status === 'active' && (isExpired || isExpiringSoon) && (
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => handleRenewSubscription(displaySubscription)}
                              >
                                Renovar Suscripción
                              </Button>
                            );
                          })()}
                          {displaySubscription.status !== 'cancelled' && displaySubscription.status !== 'expired' && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleCancelSubscription(displaySubscription.id)}
                            >
                              Cancelar Suscripción
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Sin suscripción</div>
                    );
                  })()}
                </div>
              )}

              {/* Show cancelled status message */}
              {selectedOrgForSubscription.subscription_status === 'cancelled' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="text-sm font-bold text-red-700 mb-2">Suscripción Cancelada</div>
                  <div className="text-sm text-red-600">
                    Esta organización tiene su suscripción cancelada. Puede asignar una nueva suscripción seleccionando un plan abajo.
                  </div>
                </div>
              )}

              {/* Plan Selection */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Plan de Suscripción</Label>
                <select
                  value={subscriptionFormData.plan_id}
                  onChange={e => setSubscriptionFormData({ ...subscriptionFormData, plan_id: e.target.value })}
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  required
                >
                  <option value="">Seleccionar plan</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrency(plan.price)} ({plan.duration_in_days} días)
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto Renew */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Renovación Automática</Label>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={subscriptionFormData.auto_renew}
                    onCheckedChange={checked => setSubscriptionFormData({ ...subscriptionFormData, auto_renew: checked })}
                  />
                  <span className="text-sm text-gray-600">
                    Renovar automáticamente al vencer
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="ghost" type="button" onClick={() => setSubscriptionModalOpen(false)} className="rounded-xl font-bold">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px] rounded-xl font-bold shadow-lg shadow-indigo-500/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Dialog Global */}
      <AlertDialog
        open={alertConfig.open}
        onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, open }))}
        title={alertConfig.title}
        description={alertConfig.description}
        onConfirm={alertConfig.onConfirm}
        variant={alertConfig.variant}
        showCancel={alertConfig.showCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />
    </div>
  );
}
