import { supabase } from './supabase';

async function getFreshToken(): Promise<string | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return null;
  }

  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);

  if (expiresAt - now < 60) {
    const {
      data: { session: refreshed },
      error: refreshError,
    } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed) {
      return session.access_token;
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reservation-email`,
      {
        method: 'POST',
        headers,
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
