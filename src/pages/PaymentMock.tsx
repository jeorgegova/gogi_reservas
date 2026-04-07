import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function PaymentMockPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const { profile, isGuest } = useAuth();

  useEffect(() => {
    fetchReservation();
  }, [id]);

  const fetchReservation = async () => {
    const { data } = await supabase
      .from('reservations')
      .select(`
        *,
        common_areas (name)
      `)
      .eq('id', id)
      .single();

    setReservation(data);
    setLoading(false);
  };

  const handlePayment = async () => {
    setProcessing(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { error } = await supabase
      .from('reservations')
      .update({ status: 'pending_validation' })
      .eq('id', id);

    if (!error) {
      setSuccess(true);
      const targetPath = isGuest ? `/${profile?.organization_slug}` : '/reservations/my';
      setTimeout(() => navigate(targetPath, { replace: true }), 3000);
    }
    setProcessing(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  if (!reservation) return <div>Reserva no encontrada.</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {!success ? (
          <Card className="border-none shadow-sm">
            <CardHeader className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Pago Seguro</h2>
              <p className="mt-2 text-sm text-gray-600">Procesa tu pago de forma segura</p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <CreditCard className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="font-semibold text-gray-900">{reservation.common_areas?.name}</h3>
                  <p className="text-sm text-gray-500">Servicio reservado</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-gray-600">Cifrado de grado militar activo</span>
                </div>
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-gray-600">Privacidad total de datos</span>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 font-medium text-gray-700">Total a pagar</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(reservation.total_cost)}</p>
              </div>

              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl shadow-md"
                onClick={handlePayment}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    PROCESANDO...
                  </>
                ) : "CONFIRMAR PAGO"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">¡Éxito!</h2>
            <p className="text-sm text-gray-600">Tu transacción ha sido validada</p>

            <Card className="p-4 border-none shadow-sm">
              <p className="mb-2 text-sm font-medium text-gray-700">Reserva Confirmada</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(reservation.total_cost)}</p>
              <p className="mt-2 text-xs text-gray-500 font-mono">
                AUT-REF: {reservation.id.substring(0, 16).toUpperCase()}
              </p>
            </Card>

            <Button
              className="w-full mt-4 bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl shadow-md"
              onClick={() => {
                const targetPath = isGuest ? `/${profile?.organization_slug}` : '/reservations/my';
                navigate(targetPath, { replace: true });
              }}
            >
              {isGuest ? 'VOLVER AL INICIO' : 'VER MIS RESERVAS'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
