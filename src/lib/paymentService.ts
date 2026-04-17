import { supabase } from './supabase';
import type { CreatePaymentResult } from './paymentProvider';

export type { CreatePaymentResult };

async function getFreshToken(): Promise<string> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('No hay sesión activa. Por favor inicia sesión.');
  }

  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);

  if (expiresAt - now < 60) {
    const {
      data: { session: refreshed },
      error: refreshError,
    } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed) {
      throw new Error(
        'Error al refrescar la sesión. Por favor inicia sesión de nuevo.'
      );
    }
    return refreshed.access_token;
  }

  return session.access_token;
}

async function callEdgeFunction(
  functionName: string,
  body: Record<string, unknown>
): Promise<CreatePaymentResult> {
  const token = await getFreshToken();

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }
  return data;
}

export async function createReservationPayment(
  reservationId: string
): Promise<CreatePaymentResult> {
  return callEdgeFunction('create-wompi-reservation-payment', {
    reservation_id: reservationId,
  });
}

export async function createSubscriptionPayment(
  subscriptionId: string
): Promise<CreatePaymentResult> {
  return callEdgeFunction('create-wompi-subscription-payment', {
    subscription_id: subscriptionId,
  });
}

export async function verifyPaymentStatus(
  reservationId: string
): Promise<'pending' | 'completed' | 'failed' | 'cancelled'> {
  const { data, error } = await supabase
    .from('payments')
    .select('status')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return 'pending';
  return data.status as 'pending' | 'completed' | 'failed' | 'cancelled';
}
