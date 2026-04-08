import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  Settings
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

// Componente de input con formato de moneda
function CurrencyInput({ value, onChange, className, placeholder }: { value: number; onChange: (val: number) => void; className?: string; placeholder?: string }) {
  const [displayValue, setDisplayValue] = useState('');

  // Formatear número con separador de miles
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  useEffect(() => {
    if (value) {
      setDisplayValue(formatNumber(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Eliminar puntos y cualquier caracter que no sea número
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    // Guardar el valor sin formato para el servidor
    const numValue = rawValue ? parseInt(rawValue, 10) : 0;
    onChange(numValue);
    // Mostrar con formato de miles
    setDisplayValue(rawValue ? formatNumber(parseInt(rawValue, 10)) : '');
  };

  const handleFocus = () => {
    // Al hacer focus, mostrar sin formato para facilitar edición
    if (value) {
      setDisplayValue(value.toString());
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
      <Input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        className={cn("pl-6", className)}
        placeholder={placeholder || "0"}
      />
    </div>
  );
}

export default function AdminAreasPage() {
  const { profile, terminology } = useAuth();
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentArea, setCurrentArea] = useState<any>({
    name: '',
    description: '',
    max_hours_per_reservation: 4,
    cost_per_hour: 0,
    pricing_type: 'hourly',
    cost_jornada_diurna: 0,
    cost_jornada_nocturna: 0,
    cost_jornada_ambos: 0,
    jornada_hours_diurna: 10,
    jornada_hours_nocturna: 6,
    image_url: '',
    is_active: true,
    is_free: false
  });

  useEffect(() => {
    if (profile?.organization_id) {
      fetchAreas();
    }
  }, [profile?.organization_id]);

  const fetchAreas = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('common_areas')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });
    setAreas(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const orgId = profile?.organization_id;

    // Si is_free es true, seteamos todos los costos a 0
    const isFree = currentArea.is_free || false;
    
    // Filtrar solo los campos que existen en la tabla common_areas
    const areaData = {
      name: currentArea.name,
      description: currentArea.description || null,
      max_hours_per_reservation: currentArea.max_hours_per_reservation || 4,
      cost_per_hour: isFree ? 0 : (currentArea.cost_per_hour || 0),
      pricing_type: currentArea.pricing_type || 'hourly',
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

    console.log('Area data to save:', areaData);

    if (currentArea.id) {
      try {
        const { error } = await supabase
          .from('common_areas')
          .update(areaData)
          .eq('id', currentArea.id)
          .eq('organization_id', orgId);
        if (error) throw error;
      } catch (error: any) {
        console.error('Error updating area:', error);
        alert('Error updating area: ' + error.message);
        return;
      }
    } else {
      await supabase
        .from('common_areas')
        .insert(areaData);
    }
    setIsEditing(false);
    fetchAreas();
  };

  const handleEdit = (area: any) => {
    setCurrentArea(area);
    setIsEditing(true);
  };

  const handleToggleActive = async (area: any) => {
    await supabase
      .from('common_areas')
      .update({ is_active: !area.is_active })
      .eq('id', area.id)
      .eq('organization_id', profile?.organization_id);
    fetchAreas();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de {terminology.areaLabel}s</h1>
            <p className="text-gray-500 text-sm">Configura los espacios disponibles para {terminology.reservationLabel.toLowerCase()}s.</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setCurrentArea({
              name: '', description: '', max_hours_per_reservation: 4, cost_per_hour: 0,
              pricing_type: 'hourly', cost_jornada_diurna: 0, cost_jornada_nocturna: 0,
              cost_jornada_ambos: 0, jornada_hours_diurna: 10, jornada_hours_nocturna: 6,
              image_url: '', is_active: true, is_free: false
            });
            setIsEditing(true);
          }}
          className="bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 font-black h-12 px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-none"
        >
          <Plus className="w-4 h-4 mr-2" /> Nueva {terminology.areaLabel}
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
                      <option value="hourly">Por Hora</option>
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

                  {currentArea.pricing_type === 'hourly' ? (
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
                        {/* Jornada Diurna */}
                        <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Sun className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold uppercase">Diurna</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Desde</Label>
                              <Input
                                type="time"
                                value={currentArea.jornada_start_diurna || '08:00'}
                                onChange={e => setCurrentArea({ ...currentArea, jornada_start_diurna: e.target.value })}
                                className="h-8 rounded-lg text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Hasta</Label>
                              <Input
                                type="time"
                                value={currentArea.jornada_end_diurna || '18:00'}
                                onChange={e => setCurrentArea({ ...currentArea, jornada_end_diurna: e.target.value })}
                                className="h-8 rounded-lg text-xs"
                              />
                            </div>
                          </div>
                          {!currentArea.is_free && (
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-gray-400">Costo</Label>
                            <CurrencyInput
                              value={currentArea.cost_jornada_diurna}
                              onChange={(val) => setCurrentArea({ ...currentArea, cost_jornada_diurna: val })}
                              className="h-8 rounded-lg text-xs"
                            />
                          </div>
                          )}
                        </div>

                        {/* Jornada Nocturna */}
                        <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Moon className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold uppercase">Nocturna</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Desde</Label>
                              <Input
                                type="time"
                                value={currentArea.jornada_start_nocturna || '18:00'}
                                onChange={e => setCurrentArea({ ...currentArea, jornada_start_nocturna: e.target.value })}
                                className="h-8 rounded-lg text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase font-bold text-gray-400">Hasta</Label>
                              <Input
                                type="time"
                                value={currentArea.jornada_end_nocturna || '23:59'}
                                onChange={e => setCurrentArea({ ...currentArea, jornada_end_nocturna: e.target.value })}
                                className="h-8 rounded-lg text-xs"
                              />
                            </div>
                          </div>
                          {!currentArea.is_free && (
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-gray-400">Costo</Label>
                            <CurrencyInput
                              value={currentArea.cost_jornada_nocturna}
                              onChange={(val) => setCurrentArea({ ...currentArea, cost_jornada_nocturna: val })}
                              className="h-8 rounded-lg text-xs"
                            />
                          </div>
                          )}
                        </div>

                        {/* Día Completo */}
                        <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold uppercase">Completo</span>
                          </div>
                          <div className="h-[62px]"></div>
                          {!currentArea.is_free && (
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-gray-400">Costo</Label>
                            <CurrencyInput
                              value={currentArea.cost_jornada_ambos}
                              onChange={(val) => setCurrentArea({ ...currentArea, cost_jornada_ambos: val })}
                              className="h-8 rounded-lg text-xs"
                            />
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
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-100 mt-8">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="h-12 px-6 font-bold rounded-xl border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">Cancelar</Button>
                <Button type="submit" className="h-12 px-8 font-black rounded-xl bg-primary hover:bg-primary/95 shadow-lg shadow-primary/20 text-white border-none transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">Guardar cambios</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl" />)
        ) : (
          areas.map((area) => (
            <Card key={area.id}
              className={cn(
                "overflow-hidden border-none apple-shadow rounded-2xl bg-white transition-all duration-300 hover:apple-shadow-hover hover:-translate-y-1",
                !area.is_active && "opacity-60 grayscale"
              )}
            >
              <div className="h-40 relative overflow-hidden group">
                {area.image_url ? (
                  <img src={area.image_url} alt={area.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                    <Building2 className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Button size="sm" onClick={() => handleEdit(area)} className="bg-white text-gray-900 hover:bg-gray-100">
                    <Edit2 className="w-3.5 h-3.5 mr-2" /> Editar
                  </Button>
                  <Button size="sm" variant={area.is_active ? "destructive" : "default"} onClick={() => handleToggleActive(area)}>
                    {area.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </div>
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900 truncate pr-2">{area.name}</h3>
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                    area.is_active ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-400 border-gray-200"
                  )}>
                    {area.is_active ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3">
                <p className="text-xs text-gray-500 line-clamp-1">{area.description}</p>
                <div className="pt-2 flex justify-between items-center text-xs border-t border-gray-50">
                  {area.pricing_type === 'jornada' ? (
                    <div className="flex flex-col w-full">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-gray-400 uppercase">Diurna</span>
                        <span className="font-bold text-gray-900">{formatCurrency(area.cost_jornada_diurna)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-gray-400 uppercase">Nocturna</span>
                        <span className="font-bold text-gray-900">{formatCurrency(area.cost_jornada_nocturna)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 uppercase">Completo</span>
                        <span className="font-bold text-gray-900">{formatCurrency(area.cost_jornada_ambos)}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase">Costo Hora</span>
                        <span className="font-bold text-gray-900">{formatCurrency(area.cost_per_hour)}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-gray-400 uppercase">Máximo</span>
                        <span className="font-bold text-gray-600">{area.max_hours_per_reservation}h</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
