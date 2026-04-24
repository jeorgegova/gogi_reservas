import { useState, useEffect, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, detoxTime, formatDate, formatDateTimeISO, formatTime } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useCommonAreasQuery } from '@/hooks/useCommonAreas';
import { useReservationsQuery } from '@/hooks/useReservations';
import { useQueryClient } from '@tanstack/react-query';
import * as reservationService from '@/services/reservations';
import {
    Filter,
    Calendar,
    DollarSign,
    Bell,
    Users,
    BarChart3,
    PieChart,
    Activity,
    Target,
    AlertCircle
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
    Legend,
    AreaChart,
    Area
} from 'recharts';
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// Colores para gráficos
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Calendario() {
    const navigate = useNavigate();
    const { profile, terminology } = useAuth();
    const location = useLocation();
    const isAdminPage = location.pathname === '/admin';
    // Only show analytics on /admin route, not on /dashboard
    const showAnalytics = isAdminPage;
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    // Estado para filtros
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
    const [selectedAreaId, setSelectedAreaId] = useState<string>('all');

    // Estado para el dashboard residente
    const [calendarRange, setCalendarRange] = useState<{ start: string; end: string } | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const queryClient = useQueryClient();
    const calendarRef = useRef<FullCalendar>(null);

    // Queries
    const { data: areasData = [] } = useCommonAreasQuery(profile?.organization_id);
    const { data: reservationsData = [] } = useReservationsQuery(
        profile?.organization_id,
        calendarRange?.start || startOfMonth(new Date()).toISOString(),
        calendarRange?.end || endOfMonth(new Date()).toISOString()
    );

    // For notices, we'll still use a simple query for now or create a hook if needed
    // Given the prompt focuses on reservations, I'll keep notices minimal for now but use the same range logic
    const [notices, setNotices] = useState<any[]>([]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Estado para datos del admin
    const [adminStats, setAdminStats] = useState({
        totalReservations: 0,
        totalRevenue: 0,
        activeUsers: 0,
        occupancyRate: 0,
        reservationsToday: 0,
        pendingValidation: 0,
        reservationsByStatus: [] as any[],
        reservationsByArea: [] as any[],
        monthlyReservations: [] as any[],
        recentReservations: [] as any[]
    });

    useEffect(() => {
        if (calendarRange) {
            fetchNotices(calendarRange.start, calendarRange.end);
        }

        if (showAnalytics) {
            fetchAdminData();
        }
    }, [showAnalytics, selectedMonth, selectedAreaId, calendarRange, profile?.organization_id]); // Added profile.organization_id to dependencies

    const fetchNotices = async (startRange: string, endRange: string) => {
        try {
            const { data } = await supabase
                .from('maintenance_notices')
                .select(`
                    *,
                    common_areas (name)
                `)
                .eq('organization_id', profile?.organization_id)
                .eq('is_active', true)
                .gte('starts_at', startRange)
                .lte('ends_at', endRange);

            setNotices(data || []);
        } catch (error) {
            console.error('Error fetching notices:', error);
        }
    };

    const fetchAdminData = async () => {
        try {
            // Obtener reservas de los últimos 12 meses con información del perfil
            const twelveMonthsAgo = subMonths(new Date(), 12);
            const { data: allReservations, error } = await supabase
                .from('reservations')
                .select(`
                    *,
                    common_areas (name),
                    profiles:user_id (full_name)
                `)
                .eq('organization_id', profile?.organization_id)
                .gte('created_at', twelveMonthsAgo.toISOString());

            if (error) throw error;

            // Obtener usuarios residentes
            const { data: usersData } = await supabase
                .from('profiles')
                .select('id')
                .eq('organization_id', profile?.organization_id)
                .eq('role', 'user');

            // Areas are now from useCommonAreasQuery (areasData)

            // Procesar datos para gráficos
            const processedData = processAdminData(allReservations || [], areasData || [], usersData?.length || 0);
            setAdminStats(processedData);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
    };

    const processAdminData = (reservations: any[], areas: any[], userCount: number) => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

        // Filtrar por mes seleccionado si aplica
        const [selYear, selMonth] = selectedMonth.split('-').map(Number);
        const selectedMonthStart = new Date(selYear, selMonth - 1, 1);
        const selectedMonthEnd = endOfMonth(selectedMonthStart);

        const filteredByMonth = reservations.filter(res => {
            const resDate = new Date(res.start_datetime);
            return resDate >= selectedMonthStart && resDate <= selectedMonthEnd;
        });

        const filteredByArea = selectedAreaId !== 'all'
            ? filteredByMonth.filter(r => r.common_area_id === selectedAreaId)
            : filteredByMonth;

        // Reservas hoy (independiente del filtro de mes)
        const reservationsToday = reservations.filter(res =>
            res.start_datetime >= startOfToday && res.start_datetime <= endOfToday
        ).length;

        // Pagos pendientes de validar (independiente del filtro de mes)
        const pendingValidation = reservations.filter(res => res.status === 'pending_validation').length;

        // Reservas por estado (del mes seleccionado)
        const statusCount: Record<string, number> = {};
        filteredByArea.forEach(res => {
            statusCount[res.status] = (statusCount[res.status] || 0) + 1;
        });
        const reservationsByStatus = Object.entries(statusCount).map(([name, value]) => ({
            name: getStatusLabel(name),
            value
        }));

        // Reservas por área (del mes seleccionado)
        const areaCount: Record<string, number> = {};
        filteredByArea.forEach(res => {
            const areaName = res.common_areas?.name || 'Desconocida';
            areaCount[areaName] = (areaCount[areaName] || 0) + 1;
        });
        const reservationsByArea = Object.entries(areaCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

        // Reservas por mes (últimos 12 meses - usa todas las reservas)
        const months = eachMonthOfInterval({
            start: subMonths(new Date(), 11),
            end: new Date()
        });

        const monthlyData = months.map(month => {
            const mStart = startOfMonth(month);
            const mEnd = endOfMonth(month);
            const count = reservations.filter(res => {
                const resDate = new Date(res.start_datetime);
                return resDate >= mStart && resDate <= mEnd;
            }).length;

            const monthRevenue = reservations
                .filter(res => {
                    const resDate = new Date(res.start_datetime);
                    return resDate >= mStart && resDate <= mEnd && res.status === 'approved';
                })
                .reduce((sum, res) => sum + (res.total_cost || 0), 0);

            return {
                name: format(month, 'MMM', { locale: es }),
                reservas: count,
                ingresos: monthRevenue
            };
        });

        // Calcular tasa de ocupación
        const daysInMonth = selectedMonthEnd.getDate();
        const approvedReservations = filteredByArea.filter(r => r.status === 'approved').length;
        const totalPossibleReservations = (selectedAreaId === 'all' ? areas.length : 1) * daysInMonth * 2;
        const occupancyRate = totalPossibleReservations > 0
            ? Math.round((approvedReservations / totalPossibleReservations) * 100)
            : 0;

        // Reservas recientes (de todas)
        const recentReservations = [...reservations]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 6);

        // Calcular ingresos totales (del mes seleccionado)
        const totalRevenue = filteredByArea
            .filter(r => r.status === 'approved')
            .reduce((sum, r) => sum + (r.total_cost || 0), 0);

        return {
            totalReservations: filteredByArea.length,
            totalRevenue,
            activeUsers: userCount,
            occupancyRate,
            reservationsToday,
            pendingValidation,
            reservationsByStatus,
            reservationsByArea,
            monthlyReservations: monthlyData,
            recentReservations
        };
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'approved': 'Aprobada',
            'pending_validation': 'Pendiente Validación',
            'pending_payment': 'Pendiente Pago',
            'rejected': 'Rechazada',
            'cancelled': 'Cancelada'
        };
        return labels[status] || status;
    };

    // Generar opciones de meses para el filtro
    const monthOptions = useMemo(() => {
        const months = eachMonthOfInterval({
            start: subMonths(new Date(), 11),
            end: new Date()
        });
        return months.map(m => ({
            value: format(m, 'yyyy-MM'),
            label: format(m, 'MMMM yyyy', { locale: es })
        })).reverse();
    }, []);

    // Helper functions for calendar events
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return '#dcfce7'; // light green
            case 'pending_validation': return '#fef3c7'; // light yellow
            case 'pending_payment': return '#fecaca'; // light red
            default: return '#f3f4f6';
        }
    };

    const getStatusTextColor = (status: string) => {
        switch (status) {
            case 'approved': return '#166534'; // dark green
            case 'pending_validation': return '#92400e'; // dark amber
            case 'pending_payment': return '#991b1b'; // dark red
            default: return '#374151';
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return '#fecaca'; // light red for border
            case 'warning': return '#fef3c7'; // light yellow for border
            default: return '#dbeafe'; // light blue for border
        }
    };

    const getBrightStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return '#10b981'; // bright green
            case 'pending_validation': return '#f59e0b'; // bright yellow
            case 'pending_payment': return '#ef4444'; // bright red
            default: return '#6b7280';
        }
    };

    const getBrightSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return '#dc2626'; // bright red
            case 'warning': return '#d97706'; // bright amber
            default: return '#2563eb'; // bright blue
        }
    };

    const reservationEvents = reservationsData
        .filter((res: any) => selectedAreaId === 'all' || res.common_area_id === selectedAreaId)
        .map((res: any) => ({
            id: res.id,
            title: `${res.common_areas?.name || 'Área'}`,
            start: detoxTime(res.start_datetime),
            end: detoxTime(res.end_datetime),
            backgroundColor: getStatusColor(res.status),
            borderColor: getStatusColor(res.status),
            textColor: getStatusTextColor(res.status),
            extendedProps: {
                type: 'reservation',
                status: res.status,
                area: res.common_areas?.name || 'Área'
            }
        }));

    const maintenanceEvents = notices
        .filter(notice => selectedAreaId === 'all' || notice.common_area_id === selectedAreaId || notice.common_area_id === null)
        .map(notice => ({
            id: notice.id,
            title: `[AVISO] ${notice.common_areas?.name || 'General'}: ${notice.title}`,
            start: detoxTime(notice.starts_at),
            end: detoxTime(notice.ends_at),
            backgroundColor: '#dbeafe', // light blue
            borderColor: getSeverityColor(notice.severity),
            textColor: '#1e40af', // dark blue
            className: 'maintenance-event',
            extendedProps: {
                type: 'maintenance',
                severity: notice.severity,
                area: notice.common_areas?.name || 'General',
                content: notice.content || ''
            }
        }));

    const allEvents = [...reservationEvents, ...maintenanceEvents];

    // Renderizar vista de Admin
    if (showAnalytics) {
        return (
            <div className="space-y-6 animate-fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            Panel de Administración
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Estadísticas y métricas del sistema de {terminology.reservationLabel.toLowerCase()}s.
                        </p>
                    </div>

                    {/* Filtros */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="text-sm font-medium bg-transparent border-none focus:ring-0 outline-none text-gray-700 cursor-pointer"
                            >
                                {monthOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <select
                                value={selectedAreaId}
                                onChange={(e) => setSelectedAreaId(e.target.value)}
                                className="text-sm font-medium bg-transparent border-none focus:ring-0 outline-none text-gray-700 cursor-pointer"
                            >
                                <option value="all">Todas las {terminology.areaLabel.toLowerCase()}s</option>
                                {areasData.map(area => (
                                    <option key={area.id} value={area.id}>{area.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-none apple-shadow bg-white overflow-hidden group rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{terminology.reservationLabel}s Hoy</h3>
                            <Activity className="w-4 h-4 text-indigo-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{adminStats.reservationsToday}</div>
                            <p className="text-[10px] text-gray-500 mt-1 flex items-center">
                                <span className="text-indigo-600 font-bold mr-1">En curso</span> para el día de hoy
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none apple-shadow bg-white overflow-hidden group rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ingresos Mes</h3>
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{formatCurrency(adminStats.totalRevenue)}</div>
                            <p className="text-[10px] text-gray-500 mt-1 flex items-center">
                                <span className="text-emerald-600 font-bold mr-1">Aprobados</span> en el período
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none apple-shadow bg-white overflow-hidden group rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Por Validar</h3>
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{adminStats.pendingValidation}</div>
                            <p className="text-[10px] text-gray-500 mt-1 flex items-center">
                                <span className="text-amber-600 font-bold mr-1">Pendientes</span> de revisión manual
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none apple-shadow bg-white overflow-hidden group rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ocupación</h3>
                            <Target className="w-4 h-4 text-rose-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{adminStats.occupancyRate}%</div>
                            <p className="text-[10px] text-gray-500 mt-1 flex items-center">
                                <span className="text-rose-600 font-bold mr-1">Eficiencia</span> de uso de {terminology.areaLabel.toLowerCase()}s
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Reservas por Mes */}
                    <Card className="border-none apple-shadow bg-white rounded-2xl overflow-hidden">
                        <CardHeader className="border-b border-gray-50 p-4">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-primary" />
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{terminology.reservationLabel}s por Mes</h3>
                                    <p className="text-xs text-gray-500">Evolución de {terminology.reservationLabel.toLowerCase()}s en los últimos 12 meses</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={adminStats.monthlyReservations}>
                                        <defs>
                                            <linearGradient id="colorReservas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                        <YAxis stroke="#9ca3af" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="reservas"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorReservas)"
                                            name="Reservas"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ingresos por Mes */}
                    <Card className="border-none apple-shadow bg-white rounded-2xl overflow-hidden">
                        <CardHeader className="border-b border-gray-50 p-4">
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Ingresos por Mes</h3>
                                    <p className="text-xs text-gray-500">Ingresos generados por {terminology.reservationLabel.toLowerCase()}s aprobadas</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={adminStats.monthlyReservations}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                        <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `$${value / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                            formatter={(value) => [formatCurrency(Number(value) || 0), 'Ingresos']}
                                        />
                                        <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} name="Ingresos" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Áreas más ocupadas */}
                    <Card className="border-none apple-shadow bg-white lg:col-span-2 rounded-2xl overflow-hidden">
                        <CardHeader className="border-b border-gray-50 p-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-amber-500" />
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{terminology.areaLabel}s Más Occupadas</h3>
                                    <p className="text-xs text-gray-500">Distribución de {terminology.reservationLabel.toLowerCase()}s por {terminology.areaLabel.toLowerCase()}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={adminStats.reservationsByArea} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                                        <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={100} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                        />
                                        <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Reservas">
                                            {adminStats.reservationsByArea.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Estado de reservas */}
                    <Card className="border-none shadow-sm bg-white">
                        <CardHeader className="border-b border-gray-50 p-4">
                            <div className="flex items-center gap-2">
                                <PieChart className="w-5 h-5 text-rose-500" />
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Estado de {terminology.reservationLabel}s</h3>
                                    <p className="text-xs text-gray-500">Distribución por estado</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={adminStats.reservationsByStatus}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {adminStats.reservationsByStatus.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                        />
                                        <Legend />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Reservations Table */}
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="border-b border-gray-50 p-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{terminology.reservationLabel}s Recientes</h3>
                                <p className="text-xs text-gray-500">Últimas {terminology.reservationLabel.toLowerCase()}s realizadas en el sistema</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Área</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hora</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {adminStats.recentReservations.map((res: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {res.common_areas?.name || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900">{res.profiles?.full_name || 'Usuario desconocido'}</span>
                                                    <span className="text-[10px] text-gray-400 font-mono">{res.user_id?.substring(0, 8)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {formatDate(res.start_datetime)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {formatTime(res.start_datetime)} - {formatTime(res.end_datetime)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${res.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                                                    res.status === 'pending_validation' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                        res.status === 'pending_payment' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                            'bg-gray-50 text-gray-600 border border-gray-100'
                                                    }`}>
                                                    {getStatusLabel(res.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                                {formatCurrency(res.total_cost || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                    {adminStats.recentReservations.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                No hay {terminology.reservationLabel.toLowerCase()}s en el período seleccionado
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button asChild className="h-12 rounded-xl apple-shadow hover:apple-shadow-hover bg-primary hover:bg-primary/90 text-white font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                        <Link to="/admin/reservations">
                            <Calendar className="w-4 h-4 mr-2" />
                            Gestionar {terminology.reservationLabel}s
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-12 rounded-xl shadow-sm">
                        <Link to="/admin/areas">
                            <Activity className="w-4 h-4 mr-2" />
                            Configurar {terminology.areaLabel}s
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-12 rounded-xl shadow-sm">
                        <Link to="/admin/users">
                            <Users className="w-4 h-4 mr-2" />
                            Administrar {terminology.userLabel}s
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Renderizar vista de residente (sin cambios)
    return (
        <div className="space-y-6 animate-fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {isAdmin ? `Dashboard ${terminology.businessLabel}` : 'Calendario'}
                </h1>
                <p className="text-gray-500 text-sm">
                    Resumen general y estado de sus {terminology.areaLabel.toLowerCase()}s.
                </p>
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <Card className="border-none apple-shadow bg-white rounded-2xl overflow-hidden mb-6">
                        <CardHeader className="border-b border-gray-50 p-4 flex flex-row items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Calendario de Actividades</h3>
                                <p className="text-xs text-gray-500">Visualización de disponibilidad por {terminology.areaLabel.toLowerCase()}</p>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-gray-100">
                                <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                                <select
                                    value={selectedAreaId}
                                    onChange={(e) => setSelectedAreaId(e.target.value)}
                                    className="text-[10px] sm:text-xs font-bold bg-transparent border-none focus:ring-0 outline-none text-gray-700 cursor-pointer"
                                >
                                    <option value="all">Todas</option>
                                    {areasData.map((area: any) => (
                                        <option key={area.id} value={area.id}>{area.name}</option>
                                    ))}
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent className="p-1 sm:p-2">
                            <div className={`calendar-container compact-calendar ${isMobile ? 'mobile-month-view' : ''}`}>
                                <FullCalendar
                                    ref={calendarRef}
                                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                    initialView="dayGridMonth"
                                    headerToolbar={isMobile ? {
                                        left: 'prev title next',
                                        right: 'today dayGridMonth,timeGridWeek,timeGridDay'
                                    } : {
                                        left: 'prev,next today',
                                        center: 'title',
                                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                                    }}
                                    buttonText={{
                                        today: 'Hoy',
                                        month: 'Mes',
                                        week: 'Sem',
                                        day: 'Día'
                                    }}
                                    height="auto"
                                    aspectRatio={isMobile ? 1.0 : 3}
                                    fixedWeekCount={false}
                                    dayMaxEvents={isMobile ? 2 : 2}
                                    moreLinkText={(n) => `+${n} más`}
                                    eventContent={(eventInfo) => {
                                        const isReservation = eventInfo.event.extendedProps.type === 'reservation';
                                        const statusColor = isReservation
                                            ? getBrightStatusColor(eventInfo.event.extendedProps.status)
                                            : getBrightSeverityColor(eventInfo.event.extendedProps.severity);

                                        const isMonthView = eventInfo.view.type === 'dayGridMonth';

                                        // En móvil, mostramos punto + la hora muy pequeña (sin desbordar)
                                        if (isMonthView && isMobile) {
                                            return (
                                                <div className="flex items-center gap-0.5 w-full overflow-hidden px-0.5">
                                                    <div style={{ backgroundColor: statusColor }} className="w-1.5 h-1.5 rounded-full shadow-sm flex-shrink-0" />
                                                    {eventInfo.timeText && (
                                                        <span className="text-[8px] font-bold text-gray-700 whitespace-nowrap truncate min-w-0 flex-1 leading-none pt-0.5">
                                                            {eventInfo.timeText}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        }

                                        // Vista mes en PC: punto + hora + título (truncado)
                                        if (isMonthView && !isMobile) {
                                            return (
                                                <div className="flex items-center gap-1 overflow-hidden w-full h-full px-0.5" title={eventInfo.event.title}>
                                                    <div style={{ backgroundColor: statusColor }} className="w-2 h-2 rounded-full flex-shrink-0" />
                                                    {eventInfo.timeText && (
                                                        <span className="text-[9px] font-bold text-gray-900 whitespace-nowrap flex-shrink-0">
                                                            {eventInfo.timeText}
                                                        </span>
                                                    )}
                                                    <span className="truncate text-[9px] font-medium text-gray-600 block min-w-0 flex-1">
                                                        {eventInfo.event.title}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        // Vistas de semana y día (PC y Móvil): contenido completo
                                        return (
                                            <div className="flex flex-col gap-0.5 p-1 h-full border-l-2 overflow-hidden" style={{ borderLeftColor: statusColor }}>
                                                <span className="text-[10px] font-bold text-gray-900 border-b border-gray-100/50 pb-0.5 truncate">
                                                    {eventInfo.timeText}
                                                </span>
                                                <span className="text-[10px] sm:text-[11px] font-medium text-gray-700 leading-tight truncate whitespace-normal line-clamp-2">
                                                    {eventInfo.event.title}
                                                </span>
                                            </div>
                                        );
                                    }}
                                    dayCellContent={(arg) => {
                                        const now = new Date();
                                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                        const isPast = arg.date < today;
                                        const isBookable = !isPast;

                                        return (
                                            <div
                                                onClick={() => {
                                                    if (calendarRef.current) {
                                                        const api = calendarRef.current.getApi();
                                                        if (api.view.type === 'dayGridMonth') {
                                                            api.changeView('timeGridDay', arg.date);
                                                        } else if (isBookable) {
                                                            const dateStr = format(arg.date, 'yyyy-MM-dd');
                                                            navigate(`/reservations/new?date=${dateStr}`);
                                                        }
                                                    }
                                                }}
                                                className={cn(
                                                    "relative w-full h-full min-h-[45px] sm:min-h-[50px] p-0.5 flex flex-col justify-between group",
                                                    "cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                                )}
                                            >
                                                <div className="flex justify-end w-full p-0.5">
                                                    <span className={cn(
                                                        "text-[10px] sm:text-xs font-semibold text-gray-900 px-1 transition-colors",
                                                        arg.isToday 
                                                            ? "bg-primary text-white w-6 h-6 flex items-center justify-center rounded-full shadow-sm" 
                                                            : "hover:text-primary"
                                                    )}>
                                                        {arg.dayNumberText}
                                                    </span>
                                                </div>

                                                <div className="absolute bottom-1 right-1 p-0.5 z-10 w-full flex justify-end">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const dateStr = format(arg.date, 'yyyy-MM-dd');
                                                            navigate(`/reservations/new?date=${dateStr}`);
                                                        }}
                                                        className="w-5 h-5 sm:w-6 sm:h-6 text-primary transition-all hover:bg-primary/10 rounded-full flex items-center justify-center bg-white/50 backdrop-blur-sm sm:bg-transparent"
                                                        title={`Agregar ${terminology.reservationLabel.toLowerCase()}`}
                                                    >
                                                        <span className="text-lg sm:text-sm font-semibold leading-none">+</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }}
                                    datesSet={(dateInfo) => {
                                        const start = dateInfo.startStr;
                                        const end = dateInfo.endStr;

                                        if (calendarRange?.start !== start || calendarRange?.end !== end) {
                                            setCalendarRange({ start, end });

                                            // Prefetch next range (e.g. next month)
                                            // dateInfo.view.currentStart is the start of the current view (e.g. start of month)
                                            const nextRangeStart = addMonths(new Date(dateInfo.view.currentStart), 1);
                                            const pStart = startOfMonth(nextRangeStart).toISOString();
                                            const pEnd = endOfMonth(nextRangeStart).toISOString();

                                            queryClient.prefetchQuery({
                                                queryKey: ['reservations', profile?.organization_id, pStart, pEnd],
                                                queryFn: () => reservationService.getReservations(profile?.organization_id!, pStart, pEnd)
                                            });
                                        }
                                    }}
                                    events={allEvents}
                                    eventDidMount={(info) => {
                                        const eventId = info.event.id;

                                        // Eliminar tooltip previo si existe para este evento
                                        const existingTooltip = document.getElementById(`tooltip-${eventId}`);
                                        if (existingTooltip) {
                                            existingTooltip.remove();
                                        }

                                        // Crear tooltip con información del evento
                                        const tooltip = document.createElement('div');
                                        tooltip.id = `tooltip-${eventId}`;
                                        tooltip.className = 'calendar-tooltip';

                                        const props = info.event.extendedProps;
                                        const start = info.event.start;
                                        const end = info.event.end;
                                        const eventTitle = info.event.title;

                                        if (props.type === 'reservation') {
                                            tooltip.innerHTML = `
                                                <div style="padding: 12px; min-width: 200px;">
                                                    <div style="font-weight: 700; font-size: 14px; color: #111827; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                                        <span style="background: ${getBrightStatusColor(props.status)}; width: 8px; height: 8px; border-radius: 50%;"></span>
                                                        Reserva
                                                    </div>
                                                    <div style="font-size: 13px; color: #374151; margin-bottom: 6px;">
                                                        <strong style="color: #6b7280; font-size: 11px; text-transform: uppercase;">Área</strong><br/> ${eventTitle}
                                                    </div>
                                                    <div style="font-size: 12px; color: #4b5563; margin-bottom: 4px;">
                                                        <strong style="color: #6b7280; font-size: 11px; text-transform: uppercase;">Estado</strong><br/> ${getStatusLabel(props.status)}
                                                    </div>
                                                    <div style="font-size: 12px; color: #4b5563;">
                                                        <strong style="color: #6b7280; font-size: 11px; text-transform: uppercase;">Horario</strong><br/> ${start ? formatTime(start) : ''} - ${end ? formatTime(end) : ''}
                                                    </div>
                                                </div>
                                            `;
                                        } else {
                                            const observation = props.content ? `<div style="font-size: 12px; color: #4b5563; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e5e7eb;"><strong>Observación:</strong> ${props.content}</div>` : '';
                                            tooltip.innerHTML = `
                                                <div style="padding: 12px; min-width: 220px;">
                                                    <div style="font-weight: 700; font-size: 14px; color: #111827; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                                        <span style="background: ${getBrightSeverityColor(props.severity)}; width: 8px; height: 8px; border-radius: 50%;"></span>
                                                        Aviso
                                                    </div>
                                                    <div style="font-size: 12px; color: #374151; margin-bottom: 4px;">
                                                         <strong style="color: #6b7280; font-size: 11px; text-transform: uppercase;">Área</strong><br/> ${props.area}
                                                    </div>
                                                    <div style="font-size: 11px; color: #6b7280;">
                                                         <strong style="color: #6b7280; font-size: 11px; text-transform: uppercase;">Severidad</strong><br/> ${props.severity === 'critical' ? 'Crítica' : props.severity === 'warning' ? 'Advertencia' : 'Normal'}
                                                    </div>
                                                    <div style="font-size: 11px; color: #6b7280;">
                                                         <strong style="color: #6b7280; font-size: 11px; text-transform: uppercase;">Horario</strong><br/> ${start ? formatTime(start) : ''} - ${end ? formatTime(end) : ''}
                                                    </div>
                                                    ${observation}
                                                </div>
                                            `;
                                        }

                                        tooltip.style.cssText = `
                                            position: fixed;
                                            z-index: 9999;
                                            background: white;
                                            border: 1px solid #e5e7eb;
                                            border-radius: 12px;
                                            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                                            display: none;
                                            pointer-events: none;
                                            border-left: 4px solid ${props.type === 'reservation' ? getBrightStatusColor(props.status) : getBrightSeverityColor(props.severity)};
                                        `;

                                        document.body.appendChild(tooltip);

                                        const updateTooltipPosition = (e: MouseEvent) => {
                                            const padding = 10;

                                            // Get viewport dimensions
                                            const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
                                            const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

                                            // Get tooltip dimensions
                                            const rect = tooltip.getBoundingClientRect();
                                            const tw = rect.width || 240;
                                            const th = rect.height || 180;

                                            let left = e.clientX + padding;
                                            let top = e.clientY + padding;

                                            // Check right overflow
                                            if (left + tw > vw - padding) {
                                                left = e.clientX - tw - padding;
                                            }

                                            // Check left overflow (if it's still overflowing left after moving)
                                            if (left < padding) left = padding;

                                            // Check bottom overflow
                                            if (top + th > vh - padding) {
                                                top = e.clientY - th - padding;
                                            }

                                            // Check top overflow
                                            if (top < padding) top = padding;

                                            tooltip.style.left = `${left}px`;
                                            tooltip.style.top = `${top}px`;
                                        };

                                        // Funciones de handler con referencias estables
                                        const handleMouseEnter = (e: MouseEvent) => {
                                            tooltip.style.display = 'block';
                                            updateTooltipPosition(e);
                                        };

                                        const handleMouseMove = (e: MouseEvent) => {
                                            updateTooltipPosition(e);
                                        };

                                        const handleMouseLeave = () => {
                                            tooltip.style.display = 'none';
                                        };

                                        // Agregar los event listeners
                                        info.el.addEventListener('mouseenter', handleMouseEnter);
                                        info.el.addEventListener('mousemove', handleMouseMove);
                                        info.el.addEventListener('mouseleave', handleMouseLeave);
                                    }}
                                    locale="es"
                                    timeZone="local"
                                    eventTimeFormat={{
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        meridiem: 'short',
                                        hour12: true
                                    }}
                                    slotMinTime="08:00:00"
                                    slotMaxTime="22:00:00"
                                    allDaySlot={false}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-none apple-shadow bg-white rounded-2xl overflow-hidden">
                        <CardHeader className="border-b border-gray-50 p-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Bell className="w-4 h-4 text-primary" /> Avisos
                            </h3>
                        </CardHeader>
                        <CardContent className="p-4">
                            {notices && notices.length > 0 ? (
                                <div className="space-y-3">
                                    {notices.filter((n: any) => n.is_active !== false).slice(0, 3).map((notice: any) => (
                                        <div
                                            key={notice.id}
                                            className={`bg-gray-50 rounded-lg p-3 border border-gray-100 ${isAdmin ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
                                            onClick={() => isAdmin && navigate('/maintenance')}
                                        >
                                            <p className="text-xs font-medium text-gray-900">
                                                {notice.common_areas?.name || 'General'}
                                            </p>
                                            <p className="text-[11px] leading-relaxed text-gray-600 mt-1">
                                                {notice.title}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {formatDateTimeISO(notice.starts_at)} - {formatDateTimeISO(notice.ends_at)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <p className="text-[11px] leading-relaxed text-gray-500">
                                        No hay avisos actualmente.
                                    </p>
                                </div>
                            )}
                            <Button asChild variant="link" className="p-0 h-auto mt-3 text-xs font-bold text-primary">
                                <Link to="/maintenance">Ver todos los avisos →</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-12 rounded-xl apple-shadow hover:apple-shadow-hover transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] border-none">
                        <Link to="/reservations/new">Nueva {terminology.reservationLabel}</Link>
                    </Button>
                </div>
            </div>

        </div>
    );
}
