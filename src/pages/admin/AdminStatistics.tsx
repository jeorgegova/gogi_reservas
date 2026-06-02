import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, Users, DollarSign, Calendar as CalendarIcon, Briefcase } from 'lucide-react';

export default function AdminStatisticsPage() {
  const { profile, terminology } = useAuth();

  
  // State for month selection (default to current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  // Generate last 12 months for the selector
  const monthOptions = useMemo(() => {
    const options = [];
    let current = new Date();
    for (let i = 0; i < 12; i++) {
      const value = format(current, 'yyyy-MM');
      const label = format(current, 'MMMM yyyy', { locale: es });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      current = subMonths(current, 1);
    }
    return options;
  }, []);

  // Fetch employees (resources)
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('id, name, image_url, description')
        .eq('organization_id', profile?.organization_id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  // Fetch reservations for the selected month
  const { data: reservations = [], isLoading: loadingReservations } = useQuery({
    queryKey: ['reservations_stats', profile?.organization_id, selectedMonth],
    queryFn: async () => {
      const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`)).toISOString();
      const monthEnd = endOfMonth(parseISO(`${selectedMonth}-01`)).toISOString();

      const { data, error } = await supabase
        .from('reservations')
        .select('id, resource_id, total_cost, status')
        .eq('organization_id', profile?.organization_id)
        .in('status', ['approved', 'paid'])
        .gte('start_datetime', monthStart)
        .lte('start_datetime', monthEnd);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.organization_id && !!selectedMonth,
  });

  // Calculate statistics per employee
  const stats = useMemo(() => {
    const employeeStats: Record<string, { totalJobs: number; totalEarned: number }> = {};
    
    // Initialize stats
    employees.forEach((emp: any) => {
      employeeStats[emp.id] = { totalJobs: 0, totalEarned: 0 };
    });

    // Populate stats
    reservations.forEach((res: any) => {
      if (employeeStats[res.resource_id]) {
        employeeStats[res.resource_id].totalJobs += 1;
        employeeStats[res.resource_id].totalEarned += Number(res.total_cost || 0);
      }
    });

    return employees.map((emp: any) => ({
      ...emp,
      stats: employeeStats[emp.id] || { totalJobs: 0, totalEarned: 0 }
    })).sort((a: any, b: any) => b.stats.totalEarned - a.stats.totalEarned);
  }, [employees, reservations]);

  const globalTotalEarned = stats.reduce((sum: number, emp: any) => sum + emp.stats.totalEarned, 0);
  const globalTotalJobs = stats.reduce((sum: number, emp: any) => sum + emp.stats.totalJobs, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Rendimiento Mensual</h1>
            <p className="text-gray-500 text-sm">Visualiza las estadísticas y ganancias por {terminology.areaLabel.toLowerCase()}.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
          <CalendarIcon className="w-5 h-5 text-gray-400 ml-2" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-none bg-transparent font-medium text-gray-700 text-sm focus:ring-0 cursor-pointer pr-4"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm apple-shadow bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary/80">Ingresos Totales ({monthOptions.find(o => o.value === selectedMonth)?.label})</p>
                <p className="text-3xl font-black text-primary mt-1">{formatCurrency(globalTotalEarned)}</p>
              </div>
              <div className="p-4 bg-white rounded-2xl shadow-sm">
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm apple-shadow bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600/80">Trabajos Realizados ({monthOptions.find(o => o.value === selectedMonth)?.label})</p>
                <p className="text-3xl font-black text-emerald-600 mt-1">{globalTotalJobs}</p>
              </div>
              <div className="p-4 bg-white rounded-2xl shadow-sm">
                <Briefcase className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            <CardTitle className="text-lg">Rendimiento por {terminology.areaLabel}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingEmployees || loadingReservations ? (
            <div className="p-8 flex justify-center">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : stats.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No hay {terminology.areaLabel.toLowerCase()}s registrados en el sistema.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.map((emp: any) => (
                <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                      {emp.image_url ? (
                        <img src={emp.image_url} alt={emp.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                          {emp.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{emp.name}</h4>
                      <p className="text-xs text-gray-500">{emp.description || 'Sin especialidad'}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-6 text-right">
                    <div className="hidden sm:block">
                      <p className="text-xs font-medium text-gray-500">Trabajos</p>
                      <p className="font-bold text-gray-900">{emp.stats.totalJobs}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Generado</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(emp.stats.totalEarned)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
