-- Habilitar acceso de lectura público para los planes de suscripción
-- Esto permite que los usuarios no autenticados puedan ver los precios y planes en la landing page.
CREATE POLICY "Allow public read access to subscription_plans"
ON public.subscription_plans FOR SELECT
TO anon, authenticated
USING (true);
