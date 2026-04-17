import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { createReservationPayment, verifyPaymentStatus } from '@/lib/paymentService';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  XCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 10;

export default function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, isGuest } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [confirmedStatus, setConfirmedStatus] = useState<'checking' | 'completed' | 'failed' | 'pending' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isWompiReturn = searchParams.get('provider') === 'wompi';
  const _wompiRef = searchParams.get('ref');
  void _wompiRef;
  const isCancelled = searchParams.get('cancelled') === 'true';

  const fetchReservation = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('reservations')
      .select(`*, common_areas (name)`)
      .eq('id', id)
      .single();
    setReservation(data);
    setLoading(false);
  }, [id]);

  const pollPaymentStatus = useCallback(async () => {
    if (!id) return;
    setConfirmedStatus('checking');

    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      const status = await verifyPaymentStatus(id);
      if (status === 'completed') {
        setConfirmedStatus('completed');
        return;
      }
      if (status === 'failed' || status === 'cancelled') {
        setConfirmedStatus('failed');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    setConfirmedStatus('pending');
  }, [id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  useEffect(() => {
    if (!isWompiReturn || !id) return;

    pollPaymentStatus();
  }, [isWompiReturn, id, pollPaymentStatus]);

  useEffect(() => {
    if (isCancelled) {
      setError('El pago fue cancelado. Puedes intentarlo de nuevo.');
      setLoading(false);
    }
  }, [isCancelled]);

  const handlePayment = async () => {
    if (!id) return;
    setProcessing(true);
    setError(null);

    try {
      const result = await createReservationPayment(id);
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar el pago';
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  const getTargetPath = () => {
    return isGuest ? `/${profile?.organization_slug}` : '/reservations/my';
  };

  if (loading || (!reservation && !error)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm font-medium text-gray-500 animate-pulse">
            {isWompiReturn ? 'Verificando estado del pago...' : 'Cargando...'}
          </p>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Reserva no encontrada</h2>
          <Button className="mt-4" onClick={() => navigate(getTargetPath())}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </Card>
      </div>
    );
  }

  const renderStatusContent = () => {
    if (confirmedStatus === 'checking') {
      return (
        <div className="text-center space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-blue-100 rounded-full">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Verificando pago...</h2>
          <p className="text-sm text-gray-600">
            Estamos confirmando el estado de tu pago con Wompi. Esto puede tomar unos segundos.
          </p>
        </div>
      );
    }

    if (confirmedStatus === 'completed') {
      return (
        <div className="text-center space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-emerald-100 rounded-full">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Pago Exitoso</h2>
          <p className="text-sm text-gray-600">Tu pago ha sido confirmado correctamente</p>
          <Card className="p-4 border-none shadow-sm">
            <p className="mb-2 text-sm font-medium text-gray-700">Reserva Confirmada</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(reservation.total_cost)}
            </p>
            <p className="mt-2 text-xs text-gray-500">{reservation.common_areas?.name}</p>
          </Card>
          <Button
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl shadow-md"
            onClick={() => navigate(getTargetPath(), { replace: true })}
          >
            {isGuest ? 'VOLVER AL INICIO' : 'VER MIS RESERVAS'}
          </Button>
        </div>
      );
    }

    if (confirmedStatus === 'failed') {
      return (
        <div className="text-center space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-red-100 rounded-full">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Pago Rechazado</h2>
          <p className="text-sm text-gray-600">
            El pago no fue aprobado. Por favor intenta de nuevo.
          </p>
          <Button
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl shadow-md"
            onClick={() => {
              setConfirmedStatus(null);
              setError(null);
            }}
          >
            INTENTAR DE NUEVO
          </Button>
        </div>
      );
    }

    if (confirmedStatus === 'pending') {
      return (
        <div className="text-center space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-amber-100 rounded-full">
              <AlertCircle className="w-12 h-12 text-amber-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Pago en proceso</h2>
          <p className="text-sm text-gray-600">
            Tu pago está siendo procesado. Te notificaremos cuando se confirme.
          </p>
          <Card className="p-4 border-none shadow-sm">
            <p className="text-sm text-gray-600">
              Puedes cerrar esta página. La confirmación llegará automáticamente.
            </p>
          </Card>
          <Button
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl shadow-md"
            onClick={() => navigate(getTargetPath(), { replace: true })}
          >
            {isGuest ? 'VOLVER AL INICIO' : 'VER MIS RESERVAS'}
          </Button>
        </div>
      );
    }

    return (
      <Card className="border-none shadow-sm">
        <CardHeader className="p-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full -ml-2"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Pago Seguro</h2>
              <p className="text-sm text-gray-500 mt-0.5">Pago procesado por Wompi</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {reservation.common_areas?.name}
              </h3>
              <p className="text-sm text-gray-500">Servicio reservado</p>
            </div>
          </div>

          <div className="space-y-3 py-3 border-t border-b border-gray-100">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-gray-600">Pago seguro y encriptado</span>
            </div>
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-gray-600">Privacidad total de datos</span>
            </div>
          </div>

          <div className="mt-4 bg-gray-50 rounded-xl p-4">
            <p className="mb-1 text-sm font-medium text-gray-500">Total a pagar</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(reservation.total_cost)}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

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
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                PAGAR {formatCurrency(reservation.total_cost)}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">{renderStatusContent()}</div>
    </div>
  );
}
