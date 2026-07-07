-- Add daily reservation limit field to subscription plans
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS max_reservations_per_day integer;
