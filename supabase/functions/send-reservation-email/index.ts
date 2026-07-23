import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Configuración VAPID para Web Push
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:gogicolombia@gmail.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const STATUS_LABELS: Record<string, string> = {
  approved: "aprobada",
  rejected: "rechazada",
  cancelled: "cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  approved: "#34C759",
  rejected: "#FF3B30",
  cancelled: "#FF9500",
};

const STATUS_ICONS: Record<string, string> = {
  approved: "✅",
  rejected: "❌",
  cancelled: "❌",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getStatusMessage(status: string): { title: string; subtitle: string; message: string; pushTitle: string; pushBody: string } {
  switch (status) {
    case "approved":
      return {
        title: "Reserva confirmada",
        subtitle: "detalles de tu cita",
        message: "Tu reserva ha sido aprobada. A continuación te compartimos los detalles.",
        pushTitle: "Reserva aprobada",
        pushBody: "Su reserva ha sido aprobada correctamente.",
      };
    case "rejected":
      return {
        title: "Reserva rechazada",
        subtitle: "estado actualizado",
        message: "Lamentablemente tu reserva no pudo ser aprobada. Si tienes dudas, comunícate con la administración.",
        pushTitle: "Reserva rechazada",
        pushBody: "Su reserva ha sido rechazada. Si tienes dudas, comunícate con la administración.",
      };
    case "cancelled":
      return {
        title: "Reserva cancelada",
        subtitle: "estado actualizado",
        message: "Tu reserva ha sido cancelada. Si fue un error o necesitas reagendar, contáctanos.",
        pushTitle: "Reserva cancelada",
        pushBody: "La reserva fue cancelada.",
      };
    case "finished":
      return {
        title: "Reserva finalizada",
        subtitle: "estado actualizado",
        message: "Gracias por utilizar nuestra plataforma.",
        pushTitle: "Reserva finalizada",
        pushBody: "Gracias por utilizar nuestra plataforma.",
      };
    default:
      return {
        title: "Estado de reserva actualizado",
        subtitle: "notificación",
        message: `El estado de tu reserva cambió a: ${STATUS_LABELS[status] || status}.`,
        pushTitle: "Estado de reserva actualizado",
        pushBody: `El estado de tu reserva cambió a: ${STATUS_LABELS[status] || status}.`,
      };
  }
}

function getPushPayload(
  statusInfo: ReturnType<typeof getStatusMessage>,
  reservation: any,
  org: any,
  status: string
): { notification: object; data: object } {
  const resourceName = reservation.resources?.name || "tu reserva";
  const dateStr = formatDate(reservation.start_datetime);
  const timeStr = formatTime(reservation.start_datetime);

  // Incluimos el nombre del recurso en el cuerpo cuando sea aprobada para coincidir con el ejemplo del usuario
  let body = statusInfo.pushBody;
  if (status === "approved") {
    body = `Su reserva de ${resourceName} ha sido aprobada correctamente para el ${dateStr} a las ${timeStr}.`;
  } else if (status === "rejected") {
    body = `Su reserva de ${resourceName} ha sido rechazada.`;
  } else if (status === "cancelled") {
    body = `La reserva de ${resourceName} fue cancelada.`;
  }

  const siteUrl = org.slug ? `https://gogireservas.com/${org.slug}/mis-reservas` : "https://gogireservas.com";
  // URL real de la app donde el usuario puede ver sus reservas
  const pushUrl = "https://gogireservas.com/reservations/my";

  return {
    notification: {
      title: statusInfo.pushTitle,
      body,
      icon: "/icon-192x192.png",
      badge: "/favicon-32x32.png",
      tag: `gogi-reserva-${reservation.id}`,
      requireInteraction: false,
      renotify: false,
    },
    data: {
      url: pushUrl,
      reservationId: reservation.id,
      organizationSlug: org.slug,
      status,
      resourceName,
      date: dateStr,
      time: timeStr,
    },
  };
}

async function sendPushNotifications(
  supabase: any,
  userId: string,
  payload: { notification: object; data: object }
): Promise<{ sent: number; removed: number; errors: string[] }> {
  const result = { sent: 0, removed: 0, errors: [] as string[] };

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return result;
  }

  const { data: subscriptions, error } = await supabase
    .from("user_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return result;
  }

  await Promise.all(
    subscriptions.map(async (sub: any) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
        result.sent += 1;
      } catch (err: any) {
        const statusCode = err.statusCode;
        // 404: suscripción expirada, 410: ya no existe, 403: inválida
        if (statusCode === 404 || statusCode === 410 || statusCode === 403) {
          await supabase.from("user_push_subscriptions").delete().eq("id", sub.id);
          result.removed += 1;
        } else {
          result.errors.push(String(err.message || err));
        }
      }
    })
  );

  return result;
}

async function getOrganizationAdminUserIds(supabase: any, orgId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("organization_id", orgId)
    .in("role", ["admin", "super_admin"]);

  if (error || !data) return [];
  return Array.from(new Set(data.map((row: any) => row.user_id).filter(Boolean)));
}

async function sendPushNotificationsToUsers(
  supabase: any,
  userIds: string[],
  payload: { notification: object; data: object }
): Promise<{ sent: number; removed: number; errors: string[] }> {
  const result = { sent: 0, removed: 0, errors: [] as string[] };

  await Promise.all(
    userIds.map(async (userId) => {
      const partial = await sendPushNotifications(supabase, userId, payload);
      result.sent += partial.sent;
      result.removed += partial.removed;
      result.errors.push(...partial.errors);
    })
  );

  return result;
}

function getTemplate({
  title,
  subtitle,
  message,
  reservationDetails,
  status,
  orgName,
  logoUrl,
  siteUrl,
}: {
  title: string;
  subtitle: string;
  message: string;
  reservationDetails: string;
  status: string;
  orgName: string;
  logoUrl?: string;
  siteUrl: string;
}) {
  const statusLabel = STATUS_LABELS[status] || status;
  const statusColor = STATUS_COLORS[status] || "#8E8E93";
  const statusIcon = STATUS_ICONS[status] || "";

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>

<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <table width="100%" style="padding:40px 16px;">
    <tr>
      <td align="center">

        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.06);">

          <!-- HEADER -->
          <tr>
            <td style="padding:32px 24px 16px 24px;text-align:center;">
              ${logoUrl
      ? `<img src="${logoUrl}" alt="${orgName}" style="max-width:120px;margin-bottom:12px;" />`
      : `<div style="font-size:20px;font-weight:600;color:#1d1d1f;margin-bottom:12px;">${orgName}</div>`
    }
            </td>
          </tr>

          <!-- STATUS BADGE -->
          <tr>
            <td style="padding:0 32px 20px 32px;text-align:center;">
              <span style="display:inline-block;background:${statusColor}15;color:${statusColor};padding:8px 20px;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">
                ${statusIcon} ${statusLabel}
              </span>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:8px 32px 12px 32px;text-align:center;">

              <h1 style="margin:0 0 4px 0;font-size:22px;font-weight:600;color:#1d1d1f;">
                ${title}
              </h1>

              <p style="margin:0 0 20px 0;font-size:13px;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;">
                ${subtitle}
              </p>

              <p style="margin:0 0 24px 0;font-size:15px;color:#6e6e73;line-height:1.5;">
                ${message}
              </p>

              ${reservationDetails}

            </td>
          </tr>

          <!-- BUTTON -->
          <tr>
            <td style="padding:8px 32px 24px 32px;text-align:center;">
              <a href="${siteUrl}"
                 style="display:inline-block;background:#1d1d1f;color:#ffffff;
                        padding:14px 26px;border-radius:999px;
                        text-decoration:none;font-size:15px;font-weight:500;">
                Ver mis reservas
              </a>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:#e5e5ea;"></div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:20px;text-align:center;font-size:11px;color:#8e8e93;line-height:1.6;">
              Este es un correo automático de ${orgName}.<br />
              © ${new Date().getFullYear()} GoGi Reservas. Todos los derechos reservados.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
}

function buildDetailsHTML(reservation: any): string {
  const rows: string[] = [];

  if (reservation.resources?.name) {
    rows.push(`
      <tr>
        <td style="padding:10px 14px;background:#f9f9fb;border-radius:10px;">
          <span style="font-size:11px;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:2px;">Espacio</span>
          <span style="font-size:15px;color:#1d1d1f;font-weight:500;">${reservation.resources.name}</span>
        </td>
      </tr>
    `);
  }

  rows.push(`
    <tr>
      <td style="padding:10px 14px;background:#f9f9fb;border-radius:10px;">
        <span style="font-size:11px;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:2px;">Fecha</span>
        <span style="font-size:15px;color:#1d1d1f;font-weight:500;">${formatDate(reservation.start_datetime)}</span>
      </td>
    </tr>
  `);

  rows.push(`
    <tr>
      <td style="padding:10px 14px;background:#f9f9fb;border-radius:10px;">
        <span style="font-size:11px;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:2px;">Horario</span>
        <span style="font-size:15px;color:#1d1d1f;font-weight:500;">${formatTime(reservation.start_datetime)} – ${formatTime(reservation.end_datetime)}</span>
      </td>
    </tr>
  `);

  if (reservation.total_cost > 0) {
    const cost = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(reservation.total_cost);

    rows.push(`
      <tr>
        <td style="padding:10px 14px;background:#f9f9fb;border-radius:10px;">
          <span style="font-size:11px;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:2px;">Valor</span>
          <span style="font-size:15px;color:#1d1d1f;font-weight:500;">${cost}</span>
        </td>
      </tr>
    `);
  }

  return `
    <table width="100%" style="border-spacing:0 8px;">
      ${rows.join("")}
    </table>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { reservation_id, org_id, new_status } = payload;

    if (!reservation_id || !org_id || !new_status) {
      throw new Error("Faltan datos requeridos: reservation_id, org_id, new_status");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name, logo_url, slug, smtp_email, smtp_password")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      throw new Error("Organización no encontrada");
    }

    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .select(`
        *,
        profiles (full_name, email),
        resources (name)
      `)
      .eq("id", reservation_id)
      .single();

    if (resError || !reservation) {
      throw new Error("Reserva no encontrada");
    }

    if (new_status === "created_admin") {
      const resourceName = reservation.resources?.name || "recurso";
      const clientName = reservation.profiles?.full_name || reservation.guest_name || "Cliente";
      const dateStr = formatDate(reservation.start_datetime);
      const timeStr = formatTime(reservation.start_datetime);
      const adminUserIds = await getOrganizationAdminUserIds(supabase, org_id);
      const adminPushPayload = {
        notification: {
          title: "Nueva reserva pendiente",
          body: `${clientName} creó una nueva reserva para ${resourceName} el ${dateStr} a las ${timeStr}.`,
          icon: "/icon-192x192.png",
          badge: "/favicon-32x32.png",
          tag: `gogi-nueva-reserva-${reservation.id}`,
          requireInteraction: false,
          renotify: false,
        },
        data: {
          url: "https://gogireservas.com/admin/reservations",
          reservationId: reservation.id,
          organizationSlug: org.slug,
          status: "created_admin",
          resourceName,
          date: dateStr,
          time: timeStr,
        },
      };

      const pushResult = await sendPushNotificationsToUsers(supabase, adminUserIds, adminPushPayload);
      return new Response(JSON.stringify({ success: true, push: pushResult }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientEmail = reservation.profiles?.email;

    const statusInfo = getStatusMessage(new_status);
    const siteUrl = org.slug ? `https://gogireservas.com/${org.slug}/mis-reservas` : "https://gogireservas.com";
    const detailsHTML = buildDetailsHTML(reservation);

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: org.smtp_email,
        pass: org.smtp_password,
      },
    });

    const html = getTemplate({
      title: statusInfo.title,
      subtitle: statusInfo.subtitle,
      message: statusInfo.message,
      reservationDetails: detailsHTML,
      status: new_status,
      orgName: org.name || "GoGi Reservas",
      logoUrl: org.logo_url,
      siteUrl,
    });

    if (clientEmail) {
      await transporter.sendMail({
        from: `"${org.name}" <${org.smtp_email}>`,
        to: clientEmail,
        subject: `${statusInfo.title} – ${org.name}`,
        html,
      });
    }

    // Reutilizamos la misma información de la reserva para enviar notificaciones push
    const pushPayload = getPushPayload(statusInfo, reservation, org, new_status);
    const pushResult = reservation.user_id
      ? await sendPushNotifications(supabase, reservation.user_id, pushPayload)
      : { sent: 0, removed: 0, errors: [] as string[] };

    return new Response(JSON.stringify({ success: true, email: Boolean(clientEmail), push: pushResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-reservation-email error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
