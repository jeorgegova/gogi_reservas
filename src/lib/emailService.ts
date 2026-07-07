import { supabase } from './supabase';

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
      throw new Error('Error al refrescar la sesión. Por favor inicia sesión de nuevo.');
    }
    return refreshed.access_token;
  }

  return session.access_token;
}

export async function sendReservationEmail(
  reservationId: string,
  orgId: string,
  newStatus: string
): Promise<void> {
  try {
    const token = await getFreshToken();

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reservation-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          reservation_id: reservationId,
          org_id: orgId,
          new_status: newStatus,
        }),
      }
    );
  } catch {
    // Fire-and-forget: no bloquear la UI si el email falla
  }
}
