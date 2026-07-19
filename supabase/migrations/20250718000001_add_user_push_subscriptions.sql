-- Tabla para almacenar suscripciones push de los dispositivos de cada usuario
-- Cada fila representa un dispositivo/navegador donde el usuario ha autorizado notificaciones.

CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, endpoint)
);

COMMENT ON TABLE public.user_push_subscriptions IS 'Suscripciones Web Push por usuario/dispositivo para enviar notificaciones de reservas.';

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_user_id ON public.user_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_endpoint ON public.user_push_subscriptions(endpoint);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_push_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_push_subscriptions_updated_at ON public.user_push_subscriptions;
CREATE TRIGGER trg_user_push_subscriptions_updated_at
  BEFORE UPDATE ON public.user_push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_push_subscription_updated_at();

-- Políticas RLS
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden gestionar solo sus propias suscripciones
CREATE POLICY "Usuarios gestionan sus propias suscripciones push"
  ON public.user_push_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- El service role (edge functions) puede leer/escribir todas las suscripciones para enviar push
CREATE POLICY "Service role administra suscripciones push"
  ON public.user_push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permisos para el rol anon no son necesarios (solo usuarios autenticados se suscriben)
