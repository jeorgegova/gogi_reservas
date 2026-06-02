import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Building2,
  Edit2,
  Sun,
  Moon,
  Calendar,
  Settings,
  X,
  Clock,
  Package,
  User,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

function CurrencyInput({ value, onChange, className, placeholder }: { value: number; onChange: (val: number) => void; className?: string; placeholder?: string }) {
  const [displayValue, setDisplayValue] = useState('');

  const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  useEffect(() => {
    if (value) {
      setDisplayValue(formatNumber(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    const numValue = rawValue ? parseInt(rawValue, 10) : 0;
    onChange(numValue);
    setDisplayValue(rawValue ? formatNumber(parseInt(rawValue, 10)) : '');
  };

  const handleFocus = () => {
    if (value) setDisplayValue(value.toString());
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
      <Input type="text" value={displayValue} onChange={handleChange} onFocus={handleFocus} className={cn("pl-6", className)} placeholder={placeholder || "0"} />
    </div>
  );
}

function DurationSelector({ value, onChange }: { value: number; onChange: (min: number) => void }) {
  const options = [
    { label: '30 min', value: 30 },
    { label: '1 hora', value: 60 },
    { label: '1h 30min', value: 90 },
    { label: '2 horas', value: 120 },
    { label: '2h 30min', value: 150 },
    { label: '3 horas', value: 180 },
    { label: '3h 30min', value: 210 },
    { label: '4 horas', value: 240 },
    { label: '4h 30min', value: 270 },
    { label: '5 horas', value: 300 },
    { label: '5h 30min', value: 330 },
    { label: '6 horas', value: 360 },
    { label: '6h 30min', value: 390 },
    { label: '7 horas', value: 420 },
    { label: '7h 30min', value: 450 },
    { label: '8 horas', value: 480 },
  ];

  return (
    <select
      value={value || 60}
      onChange={e => onChange(parseInt(e.target.value))}
      className="h-10 rounded-lg text-sm border border-gray-200 bg-white px-3 w-full"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

interface LinkedAddon {
  service_id: string;
  name: string;
  description: string;
  base_cost: number;
  duration_minutes: number;
  custom_price: number;
}

export default function AdminResourcesPage() {
  const { profile, terminology, businessType } = useAuth();
  const isResidential = businessType === 'residential';
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentArea, setCurrentArea] = useState<any>({
    name: '',
    description: '',
    max_hours_per_reservation: 4,
    cost_per_hour: 0,
    fixed_cost: 0,
    estimated_duration_minutes: 60,
    pricing_type: isResidential ? 'hourly' : 'fixed',
    cost_jornada_diurna: 0,
    cost_jornada_nocturna: 0,
    cost_jornada_ambos: 0,
    jornada_hours_diurna: 10,
    jornada_hours_nocturna: 6,
    image_url: '',
    is_active: true,
    is_free: false
  });

  const [linkedAddons, setLinkedAddons] = useState<LinkedAddon[]>([]);
  const [orgAddons, setOrgAddons] = useState<any[]>([]);
  const [showAddonSelector, setShowAddonSelector] = useState(false);
  const [showNewAddonForm, setShowNewAddonForm] = useState(false);
  const [newAddon, setNewAddon] = useState({ name: '', description: '', base_cost: 0, duration_minutes: 0 });
  const [savingAddon, setSavingAddon] = useState(false);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchAreas();
      fetchOrgAddons();
    }
  }, [profile?.organization_id]);

  const fetchAreas = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('resources')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });
    setAreas(data || []);
    setLoading(false);
  };

  const fetchOrgAddons = async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .order('name');
    setOrgAddons(data || []);
  };

  const fetchLinkedAddons = async (areaId: string) => {
    const { data } = await supabase
      .from('resource_services')
      .select('*, services(*)')
      .eq('resource_id', areaId);
    if (data) {
      const mapped: LinkedAddon[] = data.map((row: any) => ({
        service_id: row.service_id,
        name: row.services?.name || '',
        description: row.services?.description || '',
        base_cost: row.services?.base_cost || 0,
        duration_minutes: row.services?.duration_minutes || 0,
        custom_price: row.custom_price ?? row.services?.base_cost ?? 0,
      }));
      setLinkedAddons(mapped);
    }
  };

  const handleEdit = async (area: any) => {
    setCurrentArea(area);
    setLinkedAddons([]);
    setIsEditing(true);
    setShowAddonSelector(false);
    setShowNewAddonForm(false);
    await fetchLinkedAddons(area.id);
  };

  const handleStartNew = () => {
    setCurrentArea({
      name: '', description: '', max_hours_per_reservation: 4, cost_per_hour: 0,
      fixed_cost: 0, estimated_duration_minutes: 60,
      pricing_type: isResidential ? 'hourly' : 'fixed', cost_jornada_diurna: 0, cost_jornada_nocturna: 0,
      cost_jornada_ambos: 0, jornada_hours_diurna: 10, jornada_hours_nocturna: 6,
      image_url: '', is_active: true, is_free: false
    });
    setLinkedAddons([]);
    setShowAddonSelector(false);
    setShowNewAddonForm(false);
    setIsEditing(true);
  };

  const handleToggleActive = async (area: any) => {
    await supabase
      .from('resources')
      .update({ is_active: !area.is_active })
      .eq('id', area.id)
      .eq('organization_id', profile?.organization_id);
    fetchAreas();
  };

  const handleAddExistingAddon = (addon: any) => {
    const alreadyLinked = linkedAddons.find(la => la.service_id === addon.id);
    if (alreadyLinked) {
      toast.error('Este servicio adicional ya está agregado');
      return;
    }
    setLinkedAddons(prev => [...prev, {
      service_id: addon.id,
      name: addon.name,
      description: addon.description || '',
      base_cost: addon.base_cost || 0,
      duration_minutes: addon.duration_minutes || 0,
      custom_price: addon.base_cost || 0,
    }]);
    setShowAddonSelector(false);
  };

  const handleRemoveLinkedAddon = (addonId: string) => {
    setLinkedAddons(prev => prev.filter(la => la.service_id !== addonId));
  };

  const handleUpdateLinkedAddonPrice = (addonId: string, price: number) => {
    setLinkedAddons(prev => prev.map(la => la.service_id === addonId ? { ...la, custom_price: price } : la));
  };

  const handleCreateAndAddAddon = async () => {
    if (!profile?.organization_id || !newAddon.name.trim()) return;
    setSavingAddon(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .insert({
          organization_id: profile.organization_id,
          name: newAddon.name.trim(),
          description: newAddon.description || null,
          base_cost: newAddon.base_cost || 0,
          duration_minutes: newAddon.duration_minutes || 0,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setLinkedAddons(prev => [...prev, {
          service_id: data.id,
          name: data.name,
          description: data.description || '',
          base_cost: data.base_cost || 0,
          duration_minutes: data.duration_minutes || 0,
          custom_price: data.base_cost || 0,
        }]);
        await fetchOrgAddons();
        setNewAddon({ name: '', description: '', base_cost: 0, duration_minutes: 0 });
        setShowNewAddonForm(false);
        toast.success('Servicio adicional creado y agregado');
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSavingAddon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = profile?.organization_id;
    const isFree = currentArea.is_free || false;

    if (currentArea.pricing_type === 'fixed' && (currentArea.estimated_duration_minutes || 0) === 0) {
      toast.error('La duración del servicio no puede ser 0 horas y 0 minutos');
      return;
    }

    if (currentArea.pricing_type === 'hourly' && (currentArea.max_hours_per_reservation || 0) === 0) {
      toast.error('El máximo de horas no puede ser 0');
      return;
    }

    if (!currentArea.name?.trim()) {
      toast.error('El nombre del servicio es obligatorio');
      return;
    }

    const areaData = {
      name: currentArea.name,
      description: currentArea.description || null,
      max_hours_per_reservation: currentArea.max_hours_per_reservation || 4,
      cost_per_hour: isFree ? 0 : (currentArea.cost_per_hour || 0),
      fixed_cost: isFree ? 0 : (currentArea.fixed_cost || 0),
      estimated_duration_minutes: currentArea.estimated_duration_minutes || 60,
      pricing_type: currentArea.pricing_type || (isResidential ? 'hourly' : 'fixed'),
      cost_jornada_diurna: isFree ? 0 : (currentArea.cost_jornada_diurna || 0),
      cost_jornada_nocturna: isFree ? 0 : (currentArea.cost_jornada_nocturna || 0),
      cost_jornada_ambos: isFree ? 0 : (currentArea.cost_jornada_ambos || 0),
      jornada_hours_diurna: currentArea.jornada_hours_diurna || 10,
      jornada_hours_nocturna: currentArea.jornada_hours_nocturna || 6,
      image_url: currentArea.image_url || null,
      is_active: currentArea.is_active !== false,
      is_free: isFree,
      organization_id: orgId
    };

    try {
      let areaId = currentArea.id;

      if (areaId) {
        const { error } = await supabase
          .from('resources')
          .update(areaData)
          .eq('id', areaId)
          .eq('organization_id', orgId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('resources')
          .insert(areaData)
          .select('id')
          .single();
        if (error) throw error;
        areaId = data.id;
      }

      // Sync linked addons
      await supabase
        .from('resource_services')
        .delete()
        .eq('resource_id', areaId);

      if (linkedAddons.length > 0) {
        const inserts = linkedAddons.map(la => ({
          resource_id: areaId,
          service_id: la.service_id,
          custom_price: la.custom_price,
        }));
        const { error: junctionError } = await supabase
          .from('resource_services')
          .insert(inserts);
        if (junctionError) console.error('Error saving area addons:', junctionError);
      }

      setIsEditing(false);
      fetchAreas();
      toast.success(currentArea.id ? 'Servicio actualizado' : 'Servicio creado');
    } catch (error: any) {
      console.error('Error saving area:', error);
      toast.error('Error: ' + error.message);
    }
  };

  const availableToAdd = orgAddons.filter(
    (oa: any) => !linkedAddons.find(la => la.service_id === oa.id)
  );

  const formatDuration = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">Gestión de {terminology.areaLabel}s</h1>
            <p className="text-gray-500 text-xs md:text-sm">Configura los espacios disponibles para {terminology.reservationLabel.toLowerCase()}s.</p>
          </div>
        </div>
        <Button
          onClick={handleStartNew}
          className="bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 font-bold h-10 md:h-12 px-4 md:px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-none text-xs md:text-sm shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" /> <span className="hidden md:inline">Nueva {terminology.areaLabel}</span><span className="md:hidden">Nueva</span>
        </Button>
      </div>

      {isEditing && (
        <Card className="border-none apple-shadow rounded-2xl overflow-hidden mt-6">
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-5 border-b border-gray-50">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{currentArea.id ? `Editar ${terminology.areaLabel}` : `Crear Nueva ${terminology.areaLabel}`}</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">Completa los detalles del espacio</p>
          </div>
          <CardContent className="p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Nombre</Label>
                    <Input
                      value={currentArea.name}
                      onChange={e => setCurrentArea({ ...currentArea, name: e.target.value })}
                      placeholder={`Ej: ${terminology.areaLabel === 'Servicio' ? 'Corte de Cabello' : 'Salón Comunal'}`}
                      required
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Descripción</Label>
                    <Input
                      value={currentArea.description}
                      onChange={e => setCurrentArea({ ...currentArea, description: e.target.value })}
                      placeholder="Breve descripción"
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">URL Imagen</Label>
                    <Input
                      value={currentArea.image_url}
                      onChange={e => setCurrentArea({ ...currentArea, image_url: e.target.value })}
                      placeholder="https://..."
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Tipo de Precio</Label>
                    <select
                      value={currentArea.pricing_type}
                      onChange={e => setCurrentArea({ ...currentArea, pricing_type: e.target.value })}
                      className="w-full h-10 rounded-lg text-sm border border-gray-200 bg-white px-3"
                    >
                      <option value="fixed">Costo Fijo por Servicio</option>
                      <option value="hourly">Costo por Hora</option>
                      <option value="jornada">Por Jornada (Día/Noche)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={currentArea.is_free}
                      onCheckedChange={(checked) => setCurrentArea({ ...currentArea, is_free: checked })}
                    />
                    <Label className="text-sm text-gray-600 cursor-pointer">{terminology.reservationLabel} sin costo</Label>
                  </div>

                  {currentArea.pricing_type === 'fixed' ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-gray-400">Costo Total Fijo</Label>
                        <CurrencyInput
                          value={currentArea.fixed_cost}
                          onChange={(val) => setCurrentArea({ ...currentArea, fixed_cost: val })}
                          className="h-10 rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-gray-400">Duración Estimada</Label>
                        <DurationSelector
                          value={currentArea.estimated_duration_minutes || 60}
                          onChange={val => setCurrentArea({ ...currentArea, estimated_duration_minutes: val })}
                        />
                      </div>
                    </>
                  ) : currentArea.pricing_type === 'hourly' ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-gray-400">Máx. Horas</Label>
                        <Input
                          type="number"
                          value={currentArea.max_hours_per_reservation}
                          onChange={e => setCurrentArea({ ...currentArea, max_hours_per_reservation: parseInt(e.target.value) })}
                          required
                          className="h-10 rounded-lg text-sm"
                        />
                      </div>
                      {!currentArea.is_free && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-gray-400">Costo Hora</Label>
                          <CurrencyInput
                            value={currentArea.cost_per_hour}
                            onChange={(val) => setCurrentArea({ ...currentArea, cost_per_hour: val })}
                            className="h-10 rounded-lg text-sm"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Sun className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold uppercase">Diurna</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Desde</Label>
                              <Input type="time" value={currentArea.jornada_start_diurna || '08:00'} onChange={e => setCurrentArea({ ...currentArea, jornada_start_diurna: e.target.value })} className="h-8 rounded-lg text-xs" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Hasta</Label>
                              <Input type="time" value={currentArea.jornada_end_diurna || '18:00'} onChange={e => setCurrentArea({ ...currentArea, jornada_end_diurna: e.target.value })} className="h-8 rounded-lg text-xs" />
                            </div>
                          </div>
                          {!currentArea.is_free && (
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Costo</Label>
                              <CurrencyInput value={currentArea.cost_jornada_diurna} onChange={(val) => setCurrentArea({ ...currentArea, cost_jornada_diurna: val })} className="h-8 rounded-lg text-xs" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Moon className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold uppercase">Nocturna</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Desde</Label>
                              <Input type="time" value={currentArea.jornada_start_nocturna || '18:00'} onChange={e => setCurrentArea({ ...currentArea, jornada_start_nocturna: e.target.value })} className="h-8 rounded-lg text-xs" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Hasta</Label>
                              <Input type="time" value={currentArea.jornada_end_nocturna || '23:59'} onChange={e => setCurrentArea({ ...currentArea, jornada_end_nocturna: e.target.value })} className="h-8 rounded-lg text-xs" />
                            </div>
                          </div>
                          {!currentArea.is_free && (
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Costo</Label>
                              <CurrencyInput value={currentArea.cost_jornada_nocturna} onChange={(val) => setCurrentArea({ ...currentArea, cost_jornada_nocturna: val })} className="h-8 rounded-lg text-xs" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold uppercase">Completo</span>
                          </div>
                          <div className="h-[62px]"></div>
                          {!currentArea.is_free && (
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Costo</Label>
                              <CurrencyInput value={currentArea.cost_jornada_ambos} onChange={(val) => setCurrentArea({ ...currentArea, cost_jornada_ambos: val })} className="h-8 rounded-lg text-xs" />
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-3 pt-4">
                    <input
                      type="checkbox"
                      id="active"
                      checked={currentArea.is_active}
                      onChange={e => setCurrentArea({ ...currentArea, is_active: e.target.checked })}
                      className="w-4 h-4 text-primary rounded border-gray-300"
                    />
                    <Label htmlFor="active" className="text-sm text-gray-600 cursor-pointer">Espacio activo</Label>
                  </div>
                </div>
              </div>

              {/* INLINE SERVICES MANAGER */}
              <div className="border-t border-gray-100 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-bold text-gray-900">Servicios adicionales</Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowAddonSelector(!showAddonSelector); setShowNewAddonForm(false); }}
                    className="h-8 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Agregar
                  </Button>
                </div>

                {linkedAddons.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {linkedAddons.map((la) => (
                      <div key={la.service_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{la.name}</span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />{formatDuration(la.duration_minutes)}
                            </span>
                          </div>
                          {la.description && <p className="text-[10px] text-gray-400 truncate">{la.description}</p>}
                          <span className="text-[10px] text-gray-400">Base: {formatCurrency(la.base_cost)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[9px] uppercase font-bold text-gray-400 whitespace-nowrap">Precio:</Label>
                          <CurrencyInput
                            value={la.custom_price}
                            onChange={(val) => handleUpdateLinkedAddonPrice(la.service_id, val)}
                            className="h-8 rounded-lg text-xs w-32"
                          />
                        </div>
                        <button type="button" onClick={() => handleRemoveLinkedAddon(la.service_id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {linkedAddons.length === 0 && !showAddonSelector && (
                  <p className="text-xs text-gray-400 text-center py-3">Sin servicios adicionales vinculados. Haz clic en "Agregar" para añadir servicios adicionales.</p>
                )}

                {/* Services selector dropdown */}
                {showAddonSelector && (
                  <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Seleccionar servicio adicional existente</Label>
                    {availableToAdd.length > 0 ? (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {availableToAdd.map((addon: any) => (
                          <button
                            key={addon.id}
                            type="button"
                            onClick={() => handleAddExistingAddon(addon)}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                          >
                            <div>
                              <span className="text-sm font-medium text-gray-900">{addon.name}</span>
                              <span className="text-[10px] text-gray-400 ml-2">{formatDuration(addon.duration_minutes)}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-500">{formatCurrency(addon.base_cost)}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">No hay servicios adicionales disponibles en la organización</p>
                    )}

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200" /></div>
                      <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-2 text-gray-400 font-bold">o crear uno nuevo</span></div>
                    </div>

                    <Button type="button" variant="outline" size="sm" onClick={() => setShowNewAddonForm(!showNewAddonForm)} className="w-full h-8 text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Crear nuevo servicio adicional
                    </Button>

                    {showNewAddonForm && (
                      <div className="border border-dashed border-primary/20 rounded-lg p-4 bg-primary/5 space-y-3 mt-2">
                        <Input
                          value={newAddon.name}
                          onChange={e => setNewAddon({ ...newAddon, name: e.target.value })}
                          placeholder="Nombre del servicio adicional (ej: Acondicionador)"
                          className="h-9 text-sm"
                        />
                        <Input
                          value={newAddon.description}
                          onChange={e => setNewAddon({ ...newAddon, description: e.target.value })}
                          placeholder="Descripción (opcional)"
                          className="h-9 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-gray-400">Costo Base</Label>
                            <CurrencyInput value={newAddon.base_cost} onChange={(val) => setNewAddon({ ...newAddon, base_cost: val })} className="h-9 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-gray-400">Duración Extra</Label>
                            <DurationSelector value={newAddon.duration_minutes} onChange={(val) => setNewAddon({ ...newAddon, duration_minutes: val })} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setShowNewAddonForm(false)} className="flex-1 h-8 text-xs">Cancelar</Button>
                          <Button type="button" size="sm" onClick={handleCreateAndAddAddon} disabled={savingAddon || !newAddon.name.trim()} className="flex-1 h-8 text-xs bg-primary text-white border-none">
                            {savingAddon ? 'Creando...' : 'Crear y Agregar'}
                          </Button>
                        </div>
                      </div>
                    )}

                    <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAddonSelector(false); setShowNewAddonForm(false); }} className="w-full text-xs text-gray-500">
                      Cerrar
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-gray-100 mt-8">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="h-12 px-6 font-bold rounded-xl border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">Cancelar</Button>
                <Button type="submit" className="h-12 px-8 font-black rounded-xl bg-primary hover:bg-primary/95 shadow-lg shadow-primary/20 text-white border-none transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">Guardar cambios</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />)
        ) : (
          areas.filter(area => !(isEditing && currentArea.id && area.id === currentArea.id)).map((area) => (
            <Card key={area.id}
              className={cn(
                "border-none apple-shadow rounded-2xl bg-white transition-all duration-300 hover:apple-shadow-hover hover:-translate-y-1",
                !area.is_active && "opacity-50 grayscale"
              )}
            >
              <div className={cn("relative overflow-hidden", isResidential ? "h-28 md:h-36" : "h-36 md:h-44 flex flex-col items-center justify-center bg-gray-50 pt-6 pb-4")}>
                {!isResidential ? (
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-white shadow-sm relative z-10 mb-2">
                    {area.image_url ? (
                      <img src={area.image_url} alt={area.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                        <User className="w-8 h-8 text-primary/40" />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {area.image_url ? (
                      <img src={area.image_url} alt={area.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                        <Building2 className="w-10 h-10 md:w-12 md:h-12 text-primary/20" />
                      </div>
                    )}
                  </>
                )}
                <div className={cn("absolute inset-0 bg-gradient-to-t via-transparent", isResidential ? "from-black/50 to-transparent" : "from-black/10 to-transparent")} />
                <div className={cn("absolute", isResidential ? "bottom-1.5 left-2 right-2" : "bottom-1.5 w-full text-center")}>
                  <h3 className={cn("font-bold leading-tight truncate", isResidential ? "text-white text-xs md:text-sm drop-shadow-lg" : "text-gray-900 text-sm md:text-base")}>{area.name}</h3>
                </div>
                <div className={cn(
                  "absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[8px] md:text-[9px] font-black uppercase border backdrop-blur-sm",
                  area.is_active
                    ? "bg-emerald-500/90 text-white border-emerald-400/50"
                    : "bg-gray-500/80 text-white border-gray-400/50"
                )}>
                  {area.is_active ? 'Activo' : 'Off'}
                </div>
                <div className="absolute top-1.5 left-1.5 bg-white/95 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-[8px] md:text-[9px] font-bold shadow-sm">
                  {area.is_free
                    ? <span className="text-emerald-600">Gratis</span>
                    : area.pricing_type === 'fixed'
                      ? <span className="text-gray-900">{formatCurrency(area.fixed_cost)}</span>
                      : area.pricing_type === 'jornada'
                        ? <span className="text-primary">Jornada</span>
                        : <span className="text-gray-900">{formatCurrency(area.cost_per_hour)}/h</span>}
                </div>
              </div>
              <div className="p-2.5 md:p-3.5 space-y-1.5 md:space-y-2">
                {area.description && (
                  <p className="text-[9px] md:text-[10px] text-gray-400 line-clamp-1">{area.description}</p>
                )}
                <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] text-gray-400 font-medium">
                  {area.pricing_type === 'fixed' ? (
                    <>
                      <Clock className="w-2.5 h-2.5 text-primary/60" />
                      <span>{formatDuration(area.estimated_duration_minutes || 60)}</span>
                    </>
                  ) : area.pricing_type === 'jornada' ? (
                    <>
                      <Calendar className="w-2.5 h-2.5 text-primary/60" />
                      <span>Jornada</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-2.5 h-2.5 text-primary/60" />
                      <span>Máx {area.max_hours_per_reservation}h</span>
                    </>
                  )}
                </div>
                <div className="flex gap-1.5 pt-1.5 border-t border-gray-50">
                  <button
                    onClick={() => handleEdit(area)}
                    className="flex-1 h-7.5 md:h-9 bg-primary/10 text-primary hover:bg-primary hover:text-white text-[9px] md:text-xs font-bold rounded-lg transition-all duration-300 active:scale-95 flex items-center justify-center gap-0.5 md:gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Editar
                  </button>
                  <button
                    onClick={() => handleToggleActive(area)}
                    className={cn(
                      "flex-1 h-7.5 md:h-9 text-[9px] md:text-xs font-bold rounded-lg transition-all duration-300 active:scale-95 flex items-center justify-center",
                      area.is_active
                        ? "bg-red-50 text-red-500 hover:bg-red-100 border border-red-200"
                        : "bg-emerald-500 text-white hover:bg-emerald-600 border border-transparent"
                    )}
                  >
                    {area.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
