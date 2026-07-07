-- Insert free plan: unlimited duration (100 years), 5 monthly reservations
INSERT INTO public.subscription_plans (name, description, price, duration_in_days, max_reservations_per_day, features, is_active)
VALUES (
  'Plan Gratuito',
  'Perfecto para probar la plataforma sin compromiso. Gestiona hasta 5 reservas diarias.',
  0,
  36500,
  5,
  '[
    "Hasta 5 reservas diarias",
    "1 Sede / Organización",
    "Recordatorios por correo",
    "Panel de administración móvil",
    "Sin costo, para siempre"
  ]',
  true
)
ON CONFLICT DO NOTHING;
