import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { TrendingUp, Users, DollarSign, Briefcase, Calendar, Percent } from 'lucide-react';

export default function AdminStatisticsPage() {
  const { profile, terminology } = useAuth();

  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');

  const getRangeISO = () => {
    const from = parseISO(`${dateFrom}T00:00:00`);
    const to = parseISO(`${dateTo}T23:59:59`);
    return { from: isValid(from) ? from.toISOString() : '', to: isValid(to) ? to.toISOString() : '' };
  };

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees_stats', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('resources').select('id, name, employee_photo_url, description, commission_percentage').eq('organization_id', profile?.organization_id).eq('is_active', true);
      if (error) throw error; return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: reservations = [], isLoading: loadingReservations } = useQuery({
    queryKey: ['reservations_stats', profile?.organization_id, dateFrom, dateTo, selectedEmployeeId],
    queryFn: async () => {
      const { from, to } = getRangeISO();
      if (!from || !to) return [];
      let q = supabase.from('reservations').select('id, resource_id, total_cost, status').eq('organization_id', profile?.organization_id).in('status', ['approved', 'paid']).gte('start_datetime', from).lte('start_datetime', to);
      if (selectedEmployeeId !== 'all') q = q.eq('resource_id', selectedEmployeeId);
      const { data, error } = await q;
      if (error) throw error; return data || [];
    },
    enabled: !!profile?.organization_id && !!dateFrom && !!dateTo,
  });

  const stats = useMemo(() => {
    const empStats: Record<string, { totalJobs: number; totalEarned: number }> = {};
    const filteredEmployees = selectedEmployeeId === 'all' ? employees : employees.filter((e: any) => e.id === selectedEmployeeId);
    filteredEmployees.forEach((emp: any) => { empStats[emp.id] = { totalJobs: 0, totalEarned: 0 }; });
    reservations.forEach((res: any) => {
      if (empStats[res.resource_id]) { empStats[res.resource_id].totalJobs += 1; empStats[res.resource_id].totalEarned += Number(res.total_cost || 0); }
    });
    return filteredEmployees.map((emp: any) => ({
      ...emp,
      stats: empStats[emp.id] || { totalJobs: 0, totalEarned: 0 },
      commission: empStats[emp.id] ? Math.round(empStats[emp.id].totalEarned * (emp.commission_percentage || 0) / 100) : 0
    })).sort((a: any, b: any) => b.stats.totalEarned - a.stats.totalEarned);
  }, [employees, reservations, selectedEmployeeId]);

  const globalTotalEarned = stats.reduce((s: number, e: any) => s + e.stats.totalEarned, 0);
  const globalTotalJobs = stats.reduce((s: number, e: any) => s + e.stats.totalJobs, 0);
  const globalTotalCommission = stats.reduce((s: number, e: any) => s + e.commission, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20"><TrendingUp className="h-5 w-5 text-white" /></div>
          <div><h1 className="text-2xl font-bold text-gray-900 tracking-tight">Rendimiento</h1><p className="text-gray-500 text-sm">Estadísticas y comisiones por {terminology.areaLabel.toLowerCase()}.</p></div>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4 flex items-end gap-4 flex-wrap">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Desde</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 rounded-lg text-sm w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-gray-400">Hasta</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 rounded-lg text-sm w-36" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setDateFrom(monthStart); setDateTo(today); }} className="h-9 text-xs rounded-lg">Mes actual</Button>
            <Button variant="outline" size="sm" onClick={() => { const d = new Date(); d.setMonth(d.getMonth() - 1); setDateFrom(format(new Date(d.getFullYear(), d.getMonth(), 1), 'yyyy-MM-dd')); setDateTo(format(new Date(d.getFullYear(), d.getMonth() + 1, 0), 'yyyy-MM-dd')); }} className="h-9 text-xs rounded-lg">Mes anterior</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-gray-50">
          <CardContent className="p-5 flex items-center justify-between">
            <div><p className="text-xs font-medium text-gray-500">Trabajos</p><p className="text-2xl font-black text-gray-900">{globalTotalJobs}</p></div>
            <Briefcase className="w-8 h-8 text-gray-200" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="p-5 flex items-center justify-between">
            <div><p className="text-xs font-medium text-emerald-600/80">Ingresos Totales</p><p className="text-2xl font-black text-emerald-600">{formatCurrency(globalTotalEarned)}</p></div>
            <DollarSign className="w-8 h-8 text-emerald-500/30" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="p-5 flex items-center justify-between">
            <div><p className="text-xs font-medium text-amber-600/80">Total Comisiones</p><p className="text-2xl font-black text-amber-600">{formatCurrency(globalTotalCommission)}</p></div>
            <Percent className="w-8 h-8 text-amber-500/30" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Users className="w-5 h-5 text-gray-400" /><CardTitle className="text-lg">Rendimiento por {terminology.areaLabel}</CardTitle></div>
            <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="h-8 rounded-lg text-xs border border-gray-200 bg-white px-2 w-40 font-medium text-gray-700">
              <option value="all">Todos los profesionales</option>
              {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingEmployees || loadingReservations ? (
            <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
          ) : stats.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No hay datos en este período.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.map((emp: any) => (
                <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                      {emp.employee_photo_url ? (
                        <img src={emp.employee_photo_url} alt={emp.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-lg">{emp.name.charAt(0)}</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{emp.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500 truncate">{emp.description || 'Sin especialidad'}</p>
                        {emp.commission_percentage > 0 && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 shrink-0">{emp.commission_percentage}% com</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6 text-right shrink-0 ml-4">
                    <div><p className="text-[10px] font-medium text-gray-400">Trabajos</p><p className="font-bold text-gray-900 text-sm">{emp.stats.totalJobs}</p></div>
                    <div><p className="text-[10px] font-medium text-gray-400">Generado</p><p className="font-bold text-emerald-600 text-sm">{formatCurrency(emp.stats.totalEarned)}</p></div>
                    <div><p className="text-[10px] font-medium text-gray-400">Comisión</p><p className="font-bold text-amber-600 text-sm">{formatCurrency(emp.commission)}</p></div>
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
